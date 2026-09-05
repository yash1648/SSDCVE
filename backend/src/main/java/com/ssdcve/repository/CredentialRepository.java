package com.ssdcve.repository;

import com.ssdcve.model.Credential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CredentialRepository
        extends JpaRepository<Credential, UUID> {

    Optional<Credential> findByCredentialNumber(
            String credentialNumber
    );

    boolean existsByCredentialNumber(
            String credentialNumber
    );

    boolean existsByIssuerIdAndCredentialNumber(
            UUID issuerId,
            String credentialNumber
    );

    List<Credential> findByIssuerIdOrderByIssuedAtDesc(
            UUID issuerId
    );

    Optional<Credential> findByIdAndIssuerId(
            UUID id,
            UUID issuerId
    );
}