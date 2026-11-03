ALTER TABLE buildings
  ADD COLUMN admin_fee DECIMAL(15, 2) NOT NULL DEFAULT 0;

ALTER TABLE payments
  ADD COLUMN concept VARCHAR(20) NOT NULL DEFAULT 'administracion';

ALTER TABLE payments
  ADD COLUMN period CHAR(7) NULL;

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_concept CHECK (concept IN ('administracion', 'extra'));

CREATE INDEX idx_payments_building_period_concept
  ON payments (building_id, period, concept);
