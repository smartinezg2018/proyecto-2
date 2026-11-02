CREATE TABLE IF NOT EXISTS cash_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  building_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  receipt_number BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cash_receipts_payment (payment_id),
  UNIQUE KEY uq_cash_receipts_building_number (building_id, receipt_number),
  KEY idx_cash_receipts_building (building_id),
  CONSTRAINT fk_cash_receipts_building FOREIGN KEY (building_id) REFERENCES buildings (id),
  CONSTRAINT fk_cash_receipts_payment FOREIGN KEY (payment_id) REFERENCES payments (id)
);

INSERT INTO permissions (code, name) VALUES
  ('billing.receipt.view', 'Consultar recibos de caja')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO profile_permissions (profile_id, permission_id)
SELECT p.id, perm.id
FROM profiles p
CROSS JOIN permissions perm
WHERE p.name = 'Administrador de edificio'
  AND perm.code IN ('billing.receipt.view', 'billing.payment.apply')
  AND NOT EXISTS (
    SELECT 1
    FROM profile_permissions pp
    WHERE pp.profile_id = p.id
      AND pp.permission_id = perm.id
  );
