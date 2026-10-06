import React from 'react';

export const GLOSSARY: Record<string, string> = {
  envelopeStructure: 'The file is shaped like a real certificate.',
  schemaConformance: 'Every required field is present and well formed.',
  issuerSignature: 'Signed by the institution named on the certificate.',
  onChainAnchor: 'Independently recorded where it cannot be altered.',
  revocationStatus: 'The issuer has not withdrawn this certificate.',
  ipfsIntegrity: 'The stored document matches the certificate exactly.',
  contentHash: 'A fingerprint of the certificate content. Any change alters it.',
  txHash: 'The reference of the recording transaction.',
};

export const GlossaryTerm: React.FC<{ term: keyof typeof GLOSSARY; children: React.ReactNode }> = ({ term, children }) => (
  <span className="group relative underline decoration-dotted underline-offset-2 cursor-help">
    {children}
    <span className="invisible group-hover:visible absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 rounded-lg border border-border bg-popover p-2 text-xs text-popover-foreground shadow-sm">
      {GLOSSARY[term]}
    </span>
  </span>
);
