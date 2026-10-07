package com.ssdcve.repository;

import com.ssdcve.model.CredentialAnchor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CredentialAnchorRepository
        extends JpaRepository<CredentialAnchor, UUID> {

    Optional<CredentialAnchor> findByCredentialId(
            UUID credentialId
    );

    List<CredentialAnchor> findAllByOrderByAnchoredAtDesc(
            Pageable pageable
    );
}
