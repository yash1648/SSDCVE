package com.ssdcve.dto.response;

import com.ssdcve.model.VerificationStatus;

public record VerificationChecks(
        boolean envelopeStructure,
        boolean schemaConformance,
        boolean issuerSignature,
        boolean onChainAnchor,
        boolean revocationStatus,
        boolean ipfsIntegrity
) {

    public static VerificationChecks fromResult(VerificationResult result, boolean malformed) {
        if (result == null || malformed) {
            return new VerificationChecks(false, false, false, false, false, false);
        }

        String reason = result.reason();
        boolean envelopeStructure = !("Invalid credential JSON".equals(reason)
                || "Credential envelope is incomplete".equals(reason)
                || "Credential payload is empty".equals(reason));

        boolean schemaConformance = envelopeStructure
                && !"Content hash mismatch".equals(reason)
                && !"Database hash mismatch".equals(reason)
                && !"Credential number mismatch".equals(reason);

        boolean ipfsIntegrity = schemaConformance
                && !"IPFS document unavailable".equals(reason)
                && !"Stored credential is invalid".equals(reason)
                && !"Envelope hash mismatch".equals(reason);

        boolean issuerSignature = ipfsIntegrity
                && !"Invalid signature".equals(reason)
                && !"Unknown issuer key".equals(reason)
                && !"Credential not in registry".equals(reason);

        boolean onChainAnchor = result.anchorVerified();
        boolean revocationStatus = result.status() != VerificationStatus.REVOKED;

        if (result.status() == VerificationStatus.VALID || result.status() == VerificationStatus.EXPIRED) {
            envelopeStructure = true;
            schemaConformance = true;
            ipfsIntegrity = true;
            issuerSignature = true;
            revocationStatus = true;
        }

        return new VerificationChecks(
                envelopeStructure,
                schemaConformance,
                issuerSignature,
                onChainAnchor,
                revocationStatus,
                ipfsIntegrity
        );
    }
}
