import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  UserResponse,
  AdminUserResponse,
  AdminIssuerResponse,
  AdminVerificationResponse,
  IssuerProfile,
  IssuerRegisterPayload,
  IssuerKey,
  HolderLookupResponse,
  CredentialIssuePayload,
  IssuerCredential,
  RevokePayload,
  RevokeResponse,
  IssuerVerificationRecord,
  WalletCredential,
  DisclosureData,
  DisclosureUpdateRequest,
  VerificationResult,
  BatchVerificationResponse,
  VerificationHistoryResponse,
  ChainStatus,
  RecentAnchor,
  AnchorLookup,
} from '../types';

// In-memory token holder + sessionStorage fallback (Never localStorage)
const TOKEN_SESSION_KEY = '_sec_ctx';

let memoryAccessToken: string | null = null;
let authFailureCallback: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  memoryAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_SESSION_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
    }
  } catch {
    // Ignore sessionStorage quota/disabled errors
  }
};

export const getAccessToken = (): string | null => {
  if (memoryAccessToken) {
    return memoryAccessToken;
  }
  try {
    const sessionToken = sessionStorage.getItem(TOKEN_SESSION_KEY);
    if (sessionToken) {
      memoryAccessToken = sessionToken;
      return sessionToken;
    }
  } catch {
    // Ignore sessionStorage quota/disabled errors
  }
  return null;
};

export const setOnAuthFailure = (cb: () => void) => {
  authFailureCallback = cb;
};

// Base URL: in browser dev environment, relative /api hits Vite proxy (backend has no CORS headers)
const envBase = import.meta.env.VITE_API_BASE_URL;
const baseURL =
  typeof window !== 'undefined' && (!envBase || envBase === 'http://localhost:6969')
    ? '/api'
    : (envBase || '/api');

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const PUBLIC_NO_TOKEN_PREFIXES = [
  '/verifier/verify',
  '/verifier/anchor',
  '/verifier/anchors',
  '/verifier/chain',
];

const isPublicRoute = (url?: string) =>
  !!url && PUBLIC_NO_TOKEN_PREFIXES.some((p) => url.includes(p));

// Request interceptor: attach bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    const isAuthRoute =
      config.url?.includes('/auth/login') || config.url?.includes('/auth/register');

    if (token && !config.headers.Authorization && !isAuthRoute && !isPublicRoute(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency queue for 401 token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Response interceptor: auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryPublic?: boolean };

    if (error.response?.status === 403) {
      (error as AxiosError & { isForbidden?: boolean }).isForbidden = true;
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      isPublicRoute(originalRequest.url) &&
      !originalRequest._retryPublic
    ) {
      originalRequest._retryPublic = true;
      delete originalRequest.headers.Authorization;
      return apiClient(originalRequest);
    }

    if (
      !error.response ||
      error.response.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      // Public retry already attempted: reject, never refresh or log out.
      (isPublicRoute(originalRequest.url) && originalRequest._retryPublic)
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ accessToken: string }>(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newToken = data.accessToken;
      setAccessToken(newToken);
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      setAccessToken(null);
      if (authFailureCallback) {
        authFailureCallback();
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// Trigger file download helper
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Domain APIs

export const authApi = {
  login: async (creds: LoginCredentials) => {
    const res = await apiClient.post<AuthResponse>('/auth/login', creds);
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  register: async (creds: RegisterCredentials) => {
    const res = await apiClient.post<UserResponse>('/auth/register', creds);
    return res.data;
  },

  refresh: async () => {
    const res = await apiClient.post<AuthResponse>('/auth/refresh');
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },
};

export const adminApi = {
  getUsers: async () => {
    const res = await apiClient.get<AdminUserResponse[]>('/admin/users');
    return res.data;
  },

  getIssuers: async () => {
    const res = await apiClient.get<AdminIssuerResponse[]>('/admin/issuers');
    return res.data;
  },

  getVerifications: async () => {
    const res = await apiClient.get<AdminVerificationResponse[]>('/admin/verifications');
    return res.data;
  },

  promoteIssuer: async (userId: string) => {
    const res = await apiClient.post<AdminUserResponse>(`/admin/users/${userId}/promote-issuer`);
    return res.data;
  },

  verifyIssuer: async (issuerId: string) => {
    const res = await apiClient.post<AdminIssuerResponse>(`/admin/issuers/${issuerId}/verify`);
    return res.data;
  },
};

export const issuerApi = {
  getMe: async () => {
    const res = await apiClient.get<IssuerProfile>('/issuer/me');
    return res.data;
  },

  registerOrg: async (payload: IssuerRegisterPayload) => {
    const res = await apiClient.post<IssuerProfile>('/issuer/register', payload);
    return res.data;
  },

  createKey: async () => {
    const res = await apiClient.post<IssuerKey>('/issuer/keys');
    return res.data;
  },

  lookupHolders: async (email: string) => {
    const res = await apiClient.get<HolderLookupResponse[]>(
      `/issuer/holders?email=${encodeURIComponent(email)}`
    );
    return res.data;
  },

  getCredentials: async () => {
    const res = await apiClient.get<IssuerCredential[]>('/issuer/credentials');
    return res.data;
  },

  getCredential: async (id: string) => {
    const res = await apiClient.get<IssuerCredential>(`/issuer/credentials/${id}`);
    return res.data;
  },

  issueCredential: async (payload: CredentialIssuePayload) => {
    const res = await apiClient.post<IssuerCredential>('/issuer/credentials', payload);
    return res.data;
  },

  attachDocument: async (credentialId: string, file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    const res = await apiClient.post<IssuerCredential>(
      `/issuer/credentials/${credentialId}/document`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data;
  },

  revokeCredential: async (credentialId: string, payload: RevokePayload) => {
    const res = await apiClient.post<RevokeResponse>(
      `/issuer/credentials/${credentialId}/revoke`,
      payload
    );
    return res.data;
  },

  getVerifications: async () => {
    const res = await apiClient.get<IssuerVerificationRecord[]>('/issuer/verifications');
    return res.data;
  },
};

export const holderApi = {
  getWallet: async () => {
    const res = await apiClient.get<WalletCredential[]>('/holder/wallet');
    return res.data;
  },

  addToWallet: async (credentialId: string) => {
    const res = await apiClient.post<WalletCredential>(`/holder/wallet/${credentialId}`);
    return res.data;
  },

  removeFromWallet: async (credentialId: string) => {
    await apiClient.delete(`/holder/wallet/${credentialId}`);
  },

  downloadEnvelope: async (credentialId: string, customFilename?: string): Promise<{ blob: Blob; filename: string }> => {
    const res = await apiClient.get<Blob>(`/holder/credentials/${credentialId}/download`, {
      responseType: 'blob',
    });
    let filename = customFilename || `credential-${credentialId}.json`;
    const disposition = res.headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    downloadBlob(res.data, filename);
    return { blob: res.data, filename };
  },

  downloadCertificate: async (credentialId: string, customFilename?: string): Promise<{ blob: Blob; filename: string }> => {
    const res = await apiClient.get<Blob>(`/holder/credentials/${credentialId}/certificate`, {
      responseType: 'blob',
    });
    let filename = customFilename || `certificate-${credentialId}.pdf`;
    const disposition = res.headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    downloadBlob(res.data, filename);
    return { blob: res.data, filename };
  },

  getDisclosure: async (credentialId: string) => {
    const res = await apiClient.get<DisclosureData>(
      `/holder/credentials/${credentialId}/disclosure`
    );
    return res.data;
  },

  updateDisclosure: async (credentialId: string, payload: DisclosureUpdateRequest) => {
    const res = await apiClient.put<DisclosureData>(
      `/holder/credentials/${credentialId}/disclosure`,
      payload
    );
    return res.data;
  },
};

export const verifierApi = {
  verifyFile: async (file: File) => {
    const formData = new FormData();
    formData.append('credentialFile', file);
    const res = await apiClient.post<VerificationResult>('/verifier/verify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  verifyById: async (credentialId: string) => {
    const res = await apiClient.get<VerificationResult>(`/verifier/verify/${credentialId}`);
    return res.data;
  },

  verifyBatch: async (files: File[]) => {
    const formData = new FormData();
    if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
      formData.append('file', files[0]);
    } else {
      files.forEach((f) => formData.append('files', f));
    }
    const res = await apiClient.post<BatchVerificationResponse>('/verifier/verify/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  exportBatchCsv: async (batchData: BatchVerificationResponse, filename = `batch-${batchData.batchId}.csv`) => {
    const res = await apiClient.post('/verifier/verify/batch/csv', batchData, {
      responseType: 'blob',
      headers: { 'Content-Type': 'application/json' },
    });
    downloadBlob(res.data, filename);
  },

  getAnchor: async (credentialNumber: string) => {
    const res = await apiClient.get<AnchorLookup>(`/verifier/anchor/${encodeURIComponent(credentialNumber)}`);
    return res.data;
  },

  getChainStatus: async () => {
    const res = await apiClient.get<ChainStatus>('/verifier/chain/status');
    return res.data;
  },

  getRecentAnchors: async (limit = 20) => {
    const res = await apiClient.get<RecentAnchor[]>(`/verifier/anchors/recent?limit=${limit}`);
    return res.data;
  },

  getHistory: async () => {
    const res = await apiClient.get<VerificationHistoryResponse[]>('/verifier/history');
    return res.data;
  },
};
