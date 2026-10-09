# Mantenimientos

Modulo para mantenimientos preventivos, correctivos, costos, proveedores y alertas.

## Endpoints

Base: `/api/v1/maintenance`

| Metodo | Ruta                                  | Permiso              | Descripcion                                          |
| ------ | ------------------------------------- | -------------------- | ---------------------------------------------------- |
| POST   | `/assets/:assetId/maintenances`       | `maintenance.create` | Registra un mantenimiento sobre un activo            |
| GET    | `/assets/:assetId/maintenances`       | `maintenance.view`   | Lista los mantenimientos de un activo                |
| GET    | `/buildings/:buildingId/maintenances` | `maintenance.view`   | Lista los mantenimientos de los activos del edificio |

Cuerpo de registro preventivo:

```json
{
  "maintenanceType": "preventivo",
  "maintenanceDate": "2026-01-15",
  "description": "Revision general de cables y frenos"
}
```

Cuerpo de registro correctivo (HU-025):

```json
{
  "maintenanceType": "correctivo",
  "maintenanceDate": "2026-02-10",
  "failure": "Fuga de aceite en la bomba",
  "cause": "Sello hidraulico desgastado",
  "actionsTaken": "Reemplazo del sello y purga del circuito"
}
```

- `maintenanceType`: `preventivo` o `correctivo`.
- `maintenanceDate`: `YYYY-MM-DD`, no puede ser futura.
- Para `preventivo`: `description` es obligatoria.
- Para `correctivo`: `failure`, `cause` y `actionsTaken` son obligatorios. `description` es opcional; si se omite, el servidor la deriva como `Falla: ... | Causa: ... | Acciones: ...`.
- No se permite registrar mantenimientos sobre activos `retirado`.
- Cada registro agrega una entrada `mantenimiento` en `asset_history` dentro de la misma transaccion y queda en la auditoria (los correctivos incluyen `failure`, `cause` y `actionsTaken` en los metadatos de auditoria).
