package com.ssdcve.repository;

import com.ssdcve.model.CredentialDisclosure;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CredentialDisclosureRepository
        extends JpaRepository<CredentialDisclosure, UUID> {

    Optional<CredentialDisclosure> findByCredentialId(UUID credentialId);
}
