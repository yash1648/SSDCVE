package com.ssdcve.service;

import com.ssdcve.dto.response.AdminIssuerResponse;
import com.ssdcve.dto.response.AdminUserResponse;
import com.ssdcve.dto.response.AdminVerificationResponse;
import com.ssdcve.model.Credential;
import com.ssdcve.model.Issuer;
import com.ssdcve.model.User;
import com.ssdcve.model.VerificationRecord;
import com.ssdcve.repository.IssuerRepository;
import com.ssdcve.repository.UserRepository;
import com.ssdcve.repository.VerificationRecordRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * ADMIN-only operations. Issuer verification is an explicit
 * administrative state transition on the existing {@code verified}
 * field, which is the same gate the issuance flow already enforces.
 */
@Service
public class AdminService {

    private final IssuerRepository issuerRepository;

    private final UserRepository userRepository;

    private final VerificationRecordRepository recordRepository;

    public AdminService(
            IssuerRepository issuerRepository,
            UserRepository userRepository,
            VerificationRecordRepository recordRepository) {
        this.issuerRepository = issuerRepository;
        this.userRepository = userRepository;
        this.recordRepository = recordRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminIssuerResponse> listIssuers() {

        return issuerRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toIssuerResponse)
                .toList();
    }

    /**
     * Idempotent state transition: unverified -> verified. A
     * verified issuer stays verified. The verified state is never
     * accepted from a request body.
     */
    @Transactional
    public AdminIssuerResponse verifyIssuer(UUID issuerId) {

        Issuer issuer = issuerRepository
                .findById(issuerId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Issuer not found"
                        ));

        if (!issuer.isVerified()) {
            issuer.setVerified(true);
            issuerRepository.save(issuer);
        }

        return toIssuerResponse(issuer);
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {

        return userRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toUserResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminVerificationResponse> listVerifications() {

        return recordRepository
                .findAllByOrderByVerifiedAtDesc()
                .stream()
                .map(this::toVerificationResponse)
                .toList();
    }

    private AdminIssuerResponse toIssuerResponse(
            Issuer issuer) {

        return new AdminIssuerResponse(
                issuer.getId(),
                issuer.getUser().getId(),
                issuer.getName(),
                issuer.getDomain(),
                issuer.isVerified(),
                issuer.getCreatedAt()
                        .toInstant(ZoneOffset.UTC),
                issuer.getUpdatedAt()
                        .toInstant(ZoneOffset.UTC)
        );
    }

    private AdminUserResponse toUserResponse(User user) {

        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getCreatedAt()
                        .toInstant(ZoneOffset.UTC),
                user.getUpdatedAt()
                        .toInstant(ZoneOffset.UTC)
        );
    }

    private AdminVerificationResponse toVerificationResponse(
            VerificationRecord record) {

        Credential credential = record.getCredential();

        return new AdminVerificationResponse(
                record.getId(),
                credential == null
                        ? null
                        : credential.getId(),
                credential == null
                        ? null
                        : credential.getCredentialNumber(),
                record.getVerifier() == null
                        ? null
                        : record.getVerifier().getId(),
                record.getResult(),
                record.getReason(),
                record.getVerifiedAt()
                        .toInstant(ZoneOffset.UTC)
        );
    }
}