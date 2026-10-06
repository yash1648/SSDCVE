package com.ssdcve.repository;

import com.ssdcve.model.IssuerKey;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IssuerKeyRepository extends JpaRepository<IssuerKey, UUID> {

    Optional<IssuerKey> findByKeyId(String keyId);

    Optional<IssuerKey> findByIssuerIdAndKeyId(UUID issuerId, String keyId);

    Optional<IssuerKey> findByIssuerIdAndActiveTrue(UUID issuerId);

    Optional<IssuerKey> findFirstByIssuerIdAndActiveTrueOrderByCreatedAtDesc(UUID issuerId);

    boolean existsByKeyId(String keyId);

    @Modifying
    @Query("UPDATE IssuerKey k SET k.active = false "
            + "WHERE k.issuer.id = :issuerId AND k.active = true")
    void deactivateByIssuerId(@Param("issuerId") UUID issuerId);
}