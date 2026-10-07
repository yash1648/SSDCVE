import React, { createContext, useCallback, useEffect, useReducer } from 'react';
import type { AuthResponse, LoginCredentials, RegisterCredentials, User, UserRole } from '../types';
import { authApi, setAccessToken, setOnAuthFailure } from '../lib/api';

export interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'AUTH_INIT_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User } }
  | { type: 'AUTH_FAILURE'; payload?: string }
  | { type: 'LOGOUT' };

const initialAuthState: AuthState = {
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_INIT_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        role: action.payload.user.role,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload || null,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
}

export const getRoleDashboardPath = (role: UserRole | null | undefined): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'ISSUER':
      return '/issuer';
    case 'HOLDER':
      return '/holder';
    case 'VERIFIER':
      return '/verifier';
    default:
      return '/';
  }
};

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<any>;
  logout: () => Promise<void>;
  getDashboardPath: (role?: UserRole) => string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Register callback with Axios interceptor
  useEffect(() => {
    setOnAuthFailure(() => {
      clearAuth();
    });
  }, [clearAuth]);

  // Attempt session restoration via silent refresh cookie (Path=/api/auth, SameSite=Lax)
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      dispatch({ type: 'AUTH_INIT_START' });
      try {
        const response = await authApi.refresh();
        if (isMounted) {
          // Token is saved strictly in memory + sessionStorage fallback
          setAccessToken(response.accessToken);

          const restoredUser: User = {
            id: response.userId,
            email: response.email,
            fullName: response.fullName,
            role: response.role,
          };

          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user: restoredUser },
          });
        }
      } catch {
        if (isMounted) {
          setAccessToken(null);
          dispatch({ type: 'AUTH_FAILURE' });
        }
      }
    };

    initializeAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      try {
        const response = await authApi.login(credentials);

        // Store access token in memory + sessionStorage fallback
        setAccessToken(response.accessToken);

        const newUser: User = {
          id: response.userId,
          email: response.email,
          fullName: response.fullName,
          role: response.role,
        };

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user: newUser },
        });

        return response;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Login failed';
        dispatch({ type: 'AUTH_FAILURE', payload: message });
        throw err;
      }
    },
    []
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<any> => {
      const newUser = await authApi.register(credentials);
      return newUser;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const getDashboardPath = useCallback(
    (targetRole?: UserRole) => {
      return getRoleDashboardPath(targetRole || state.role);
    },
    [state.role]
  );

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        error: state.error,
        login,
        register,
        logout,
        getDashboardPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
