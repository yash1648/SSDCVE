package com.ssdcve.repository;

import com.ssdcve.model.CredentialStatus;
import com.ssdcve.model.CredentialStatus.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CredentialStatusRepository
        extends JpaRepository<CredentialStatus, UUID> {

    Optional<CredentialStatus> findByCredentialId(
            UUID credentialId
    );

    Optional<CredentialStatus> findByCredentialIdAndStatus(
            UUID credentialId,
            Status status
    );
}