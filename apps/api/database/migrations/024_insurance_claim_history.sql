ALTER TABLE insurance_claims
  ADD COLUMN result TEXT NULL AFTER status,
  ADD COLUMN indemnity_amount DECIMAL(15, 2) NULL AFTER claimed_amount,
  ADD COLUMN resolved_at DATE NULL AFTER indemnity_amount,
  ADD CONSTRAINT chk_insurance_claims_indemnity_amount
    CHECK (indemnity_amount IS NULL OR indemnity_amount >= 0);
