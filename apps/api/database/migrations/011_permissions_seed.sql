INSERT INTO permissions (code, name) VALUES
  ('admin.all', 'Acceso total de administrador general'),
  ('users.list', 'Listar usuarios'),
  ('users.create', 'Registrar usuarios'),
  ('users.assign_profiles', 'Asignar perfiles a usuarios'),
  ('users.assign_buildings', 'Asignar edificios a usuarios'),
  ('profiles.create', 'Crear perfiles'),
  ('profiles.list', 'Listar perfiles'),
  ('audit.read', 'Consultar auditoría')
ON DUPLICATE KEY UPDATE name = VALUES(name)
