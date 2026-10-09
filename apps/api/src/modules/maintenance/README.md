# Mantenimientos

Modulo para mantenimientos preventivos, correctivos, costos, proveedores y alertas.

## Endpoints

Base: `/api/v1/maintenance`

| Metodo | Ruta                                  | Permiso              | Descripcion                                          |
| ------ | ------------------------------------- | -------------------- | ---------------------------------------------------- |
| POST   | `/assets/:assetId/maintenances`       | `maintenance.create` | Registra un mantenimiento sobre un activo            |
| GET    | `/assets/:assetId/maintenances`       | `maintenance.view`   | Lista los mantenimientos de un activo                |
| GET    | `/buildings/:buildingId/maintenances` | `maintenance.view`   | Lista los mantenimientos de los activos del edificio |

Cuerpo de registro:

```json
{
  "maintenanceType": "preventivo",
  "maintenanceDate": "2026-01-15",
  "description": "Revision general de cables y frenos"
}
```

- `maintenanceType`: `preventivo` o `correctivo`.
- `maintenanceDate`: `YYYY-MM-DD`, no puede ser futura.
- No se permite registrar mantenimientos sobre activos `retirado`.
- Cada registro agrega una entrada `mantenimiento` en `asset_history` dentro de la misma transaccion y queda en la auditoria.
