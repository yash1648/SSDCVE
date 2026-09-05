package com.ssdcve.repository;

import com.ssdcve.model.IssuerKey;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IssuerKeyRepository extends JpaRepository<IssuerKey, UUID> {

    Optional<IssuerKey> findByKeyId(String keyId);

    Optional<IssuerKey> findByIssuerIdAndKeyId(UUID issuerId, String keyId);

    Optional<IssuerKey> findByIssuerIdAndActiveTrue(UUID issuerId);

    boolean existsByKeyId(String keyId);
}