package com.ssdcve.service;

import com.ssdcve.model.Credential;
import com.ssdcve.model.CredentialStatus;
import com.ssdcve.model.CredentialStatus.Status;
import com.ssdcve.model.Issuer;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.CredentialStatusRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class RevocationService {

    private final CredentialRepository credentialRepository;
    private final CredentialStatusRepository statusRepository;

    public RevocationService(
            CredentialRepository credentialRepository,
            CredentialStatusRepository statusRepository) {

        this.credentialRepository = credentialRepository;
        this.statusRepository = statusRepository;
    }

    @Transactional
    public CredentialStatus revoke(
            UUID credentialId,
            Issuer requestingIssuer,
            String reason) {

        if (credentialId == null) {
            throw new IllegalArgumentException(
                    "Credential ID must not be null"
            );
        }

        if (requestingIssuer == null) {
            throw new IllegalArgumentException(
                    "Requesting issuer must not be null"
            );
        }

        Credential credential =
                credentialRepository.findById(credentialId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Credential not found: "
                                                + credentialId
                                ));

        /*
         * Critical ownership check:
         *
         * Never trust the credential ID supplied by the caller.
         * The credential must actually belong to the issuer making
         * the revocation request.
         */
        if (!credential.getIssuer()
                .getId()
                .equals(requestingIssuer.getId())) {

            throw new SecurityException(
                    "Issuer does not own this credential"
            );
        }

        CredentialStatus credentialStatus =
                statusRepository
                        .findByCredentialId(credentialId)
                        .orElseGet(() -> {
                            CredentialStatus status =
                                    new CredentialStatus();

                            status.setCredential(credential);
                            status.setStatus(Status.ACTIVE);

                            return status;
                        });

        if (credentialStatus.getStatus() == Status.REVOKED) {
            return credentialStatus;
        }

        credentialStatus.setStatus(Status.REVOKED);
        credentialStatus.setRevokedAt(
                LocalDateTime.now()
        );
        credentialStatus.setReason(reason);

        return statusRepository.save(credentialStatus);
    }
}