INSERT INTO permissions (code, name) VALUES
  ('units.list', 'Listar inmuebles'),
  ('units.create', 'Registrar inmuebles'),
  ('persons.list', 'Listar responsables'),
  ('persons.create', 'Registrar responsables'),
  ('assets.list', 'Listar activos'),
  ('assets.create', 'Registrar activos'),
  ('assets.update', 'Actualizar activos'),
  ('maintenance.view', 'Consultar mantenimientos'),
  ('insurance.view', 'Consultar seguros'),
  ('billing.view', 'Consultar facturación'),
  ('budget.view', 'Consultar presupuesto'),
  ('projects.view', 'Consultar proyectos')
ON DUPLICATE KEY UPDATE name = VALUES(name)
