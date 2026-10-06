package com.ssdcve.dto.response;

import com.ssdcve.model.CredentialStatus;

import java.time.Instant;
import java.util.UUID;

public record CredentialResponse(

        UUID id,

        String credentialNumber,

        String type,

        String title,

        UUID subjectId,

        String subjectName,

        String contentHash,

        String ipfsCid,

        String documentCid,

        String anchorTxHash,

        Long anchorBlockNumber,

        Long anchorChainId,

        String signature,

        String signatureAlgorithm,

        String keyId,

        Instant issuedAt,

        Instant expiresAt,

        CredentialStatus.Status status
) {
}