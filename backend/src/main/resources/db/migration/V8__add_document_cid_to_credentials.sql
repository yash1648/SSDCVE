-- Optional original certificate document (scan/PDF) uploaded by
-- the issuer, stored on IPFS. Not part of the signed envelope;
-- it is a human-readable attachment composed into the certificate PDF.
ALTER TABLE credentials ADD COLUMN document_cid VARCHAR(255);
ALTER TABLE credentials ADD COLUMN document_content_type VARCHAR(100);