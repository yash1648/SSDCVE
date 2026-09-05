package com.ssdcve.repository;

import com.ssdcve.model.Issuer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IssuerRepository extends JpaRepository<Issuer, UUID> {

    Optional<Issuer> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    List<Issuer> findAllByOrderByCreatedAtDesc();
}