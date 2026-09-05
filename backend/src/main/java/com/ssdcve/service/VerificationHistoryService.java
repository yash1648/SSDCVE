package com.ssdcve.service;

import com.ssdcve.dto.response.VerificationHistoryResponse;
import com.ssdcve.dto.response.VerificationResult;
import com.ssdcve.model.Credential;
import com.ssdcve.model.User;
import com.ssdcve.model.VerificationRecord;
import com.ssdcve.repository.CredentialRepository;
import com.ssdcve.repository.UserRepository;
import com.ssdcve.repository.VerificationRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Persists and reads verification history. The verification engine
 * itself stays untouched: this service only records the result it
 * produced.
 */
@Service
public class VerificationHistoryService {

    private final VerificationRecordRepository recordRepository;

    private final CredentialRepository credentialRepository;

    private final UserRepository userRepository;

    public VerificationHistoryService(
            VerificationRecordRepository recordRepository,
            CredentialRepository credentialRepository,
            UserRepository userRepository) {
        this.recordRepository = recordRepository;
        this.credentialRepository = credentialRepository;
        this.userRepository = userRepository;
    }

    /**
     * Records one verification attempt. The credential is resolved
     * from the result's credential number; when the artifact could
     * not be matched, no credential reference is fabricated. The
     * verifier is resolved from the authenticated principal; public
     * (anonymous) attempts are recorded with a null verifier.
     */
    @Transactional
    public void record(
            VerificationResult result,
            UUID verifierId) {

        VerificationRecord record = new VerificationRecord();

        if (result.credentialNumber() != null) {
            credentialRepository
                    .findByCredentialNumber(
                            result.credentialNumber()
                    )
                    .ifPresent(record::setCredential);
        }

        if (verifierId != null) {
            userRepository
                    .findById(verifierId)
                    .ifPresent(record::setVerifier);
        }

        record.setResult(result.status());
        record.setReason(result.reason());
        record.setVerifiedAt(
                LocalDateTime.now()
        );

        recordRepository.save(record);
    }

    /**
     * History scoped to one verifier, newest first.
     */
    @Transactional(readOnly = true)
    public List<VerificationHistoryResponse> listHistory(
            UUID verifierId) {

        return recordRepository
                .findByVerifierIdOrderByVerifiedAtDesc(
                        verifierId
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private VerificationHistoryResponse toResponse(
            VerificationRecord record) {

        Credential credential = record.getCredential();

        return new VerificationHistoryResponse(
                record.getId(),
                credential == null
                        ? null
                        : credential.getId(),
                credential == null
                        ? null
                        : credential.getCredentialNumber(),
                record.getResult(),
                record.getReason(),
                record.getVerifiedAt()
                        .toInstant(ZoneOffset.UTC)
        );
    }
}