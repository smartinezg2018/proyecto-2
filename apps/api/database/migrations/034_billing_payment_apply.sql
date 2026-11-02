ALTER TABLE payments
  ADD COLUMN credit_balance DECIMAL(15, 2) NOT NULL DEFAULT 0 AFTER status;

INSERT INTO permissions (code, name) VALUES
  ('billing.payment.apply', 'Aplicar pagos a facturas')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO profile_permissions (profile_id, permission_id)
SELECT p.id, perm.id
FROM profiles p
CROSS JOIN permissions perm
WHERE p.name = 'Administrador de edificio'
  AND perm.code = 'billing.payment.apply'
  AND NOT EXISTS (
    SELECT 1
    FROM profile_permissions pp
    WHERE pp.profile_id = p.id
      AND pp.permission_id = perm.id
  );
