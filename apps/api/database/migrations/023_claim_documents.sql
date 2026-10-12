CREATE TABLE IF NOT EXISTS insurance_claim_documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  claim_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(150) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_claim_document_claim FOREIGN KEY (claim_id) REFERENCES insurance_claims(id)
);
