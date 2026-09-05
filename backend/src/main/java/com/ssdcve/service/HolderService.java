package com.ssdcve.service;

import com.ssdcve.dto.response.WalletCredentialResponse;
import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialStatus;
import com.ssdcve.model.CredentialStatus.Status;
import com.ssdcve.model.HolderWallet;
import com.ssdcve.model.User;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import com.ssdcve.repository.HolderWalletRepository;
import com.ssdcve.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Holder wallet business layer. The wallet is always derived from
 * the authenticated user - a client-supplied holderId is never
 * accepted. Downloads resolve through wallet membership and return
 * the exact envelope bytes stored on IPFS (never re-signed).
 */
@Service
public class HolderService {

    private final UserRepository userRepository;
    private final HolderWalletRepository walletRepository;
    private final CredentialRepository credentialRepository;
    private final CredentialStatusRepository statusRepository;
    private final IpfsService ipfsService;

    public HolderService(
            UserRepository userRepository,
            HolderWalletRepository walletRepository,
            CredentialRepository credentialRepository,
            CredentialStatusRepository statusRepository,
            IpfsService ipfsService) {

        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.credentialRepository = credentialRepository;
        this.statusRepository = statusRepository;
        this.ipfsService = ipfsService;
    }

    @Transactional(readOnly = true)
    public List<WalletCredentialResponse> listWallet(
            UUID userId) {

        return walletRepository
                .findByUserIdOrderByStoredAtDesc(userId)
                .stream()
                .map(this::toWalletResponse)
                .toList();
    }

    @Transactional
    public WalletCredentialResponse addToWallet(
            UUID userId,
            UUID credentialId) {

        Credential credential =
                credentialRepository.findById(credentialId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Credential not found: "
                                                + credentialId
                                ));

        /*
         * Idempotent: an existing wallet entry is returned as-is.
         */
        HolderWallet wallet =
                walletRepository
                        .findByUserIdAndCredentialId(
                                userId,
                                credentialId
                        )
                        .orElseGet(() -> {

                            User user =
                                    userRepository
                                            .findById(userId)
                                            .orElseThrow(() ->
                                                    new ResponseStatusException(
                                                            HttpStatus.NOT_FOUND,
                                                            "User not found: "
                                                                    + userId
                                                    ));

                            HolderWallet entry =
                                    new HolderWallet();

                            entry.setUser(user);
                            entry.setCredential(credential);

                            return walletRepository.save(entry);
                        });

        return toWalletResponse(wallet);
    }

    @Transactional
    public void removeFromWallet(
            UUID userId,
            UUID credentialId) {

        /*
         * Scoped to the authenticated user: another holder's
         * wallet entry can never be touched. Idempotent - a
         * missing entry is a no-op.
         */
        walletRepository.deleteByUserIdAndCredentialId(
                userId,
                credentialId
        );
    }

    @Transactional(readOnly = true)
    public byte[] downloadCredential(
            UUID userId,
            UUID credentialId)
            throws Exception {

        HolderWallet wallet =
                walletRepository
                        .findByUserIdAndCredentialId(
                                userId,
                                credentialId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Credential not in wallet: "
                                                + credentialId
                                ));

        /*
         * Return the exact stored envelope from IPFS - never
         * regenerate or re-sign.
         */
        return ipfsService.retrieve(
                wallet.getCredential().getIpfsCid()
        );
    }

    @Transactional(readOnly = true)
    public String credentialFilename(
            UUID userId,
            UUID credentialId) {

        HolderWallet wallet =
                walletRepository
                        .findByUserIdAndCredentialId(
                                userId,
                                credentialId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Credential not in wallet: "
                                                + credentialId
                                ));

        return wallet.getCredential()
                .getCredentialNumber()
                + ".json";
    }

    private WalletCredentialResponse toWalletResponse(
            HolderWallet wallet) {

        Credential credential = wallet.getCredential();

        CredentialStatus status =
                statusRepository
                        .findByCredentialId(
                                credential.getId()
                        )
                        .orElse(null);

        return new WalletCredentialResponse(
                credential.getId(),
                credential.getCredentialNumber(),
                credential.getType(),
                credential.getTitle(),
                credential.getIssuer().getId(),
                credential.getIssuer().getName(),
                credential.getIssuer().getDomain(),
                credential.getIssuedAt()
                        .toInstant(ZoneOffset.UTC),
                credential.getExpiresAt() == null
                        ? null
                        : credential.getExpiresAt()
                            .toInstant(ZoneOffset.UTC),
                status == null
                        ? Status.ACTIVE
                        : status.getStatus()
        );
    }
}