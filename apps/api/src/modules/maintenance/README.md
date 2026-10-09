# Mantenimientos

Modulo para mantenimientos preventivos, correctivos, costos, proveedores y alertas.

## Endpoints

Base: `/api/v1/maintenance`

| Metodo | Ruta                                          | Permiso              | Descripcion                                          |
| ------ | --------------------------------------------- | -------------------- | ---------------------------------------------------- |
| POST   | `/assets/:assetId/maintenances`               | `maintenance.create` | Registra un mantenimiento sobre un activo            |
| GET    | `/assets/:assetId/maintenances`               | `maintenance.view`   | Lista los mantenimientos de un activo                |
| GET    | `/buildings/:buildingId/maintenances`         | `maintenance.view`   | Lista los mantenimientos de los activos del edificio |
| PATCH  | `/maintenances/:maintenanceId/status`         | `maintenance.update` | Actualiza el estado de un mantenimiento              |
| GET    | `/maintenances/:maintenanceId/status-history` | `maintenance.view`   | Lista fecha y usuario de cada cambio de estado       |

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
- Todo mantenimiento inicia en `programado`. Ese estado inicial tambien queda en `maintenance_status_history` con la fecha y el usuario que lo registro.

Cuerpo para actualizar el estado (HU-029):

```json
{
  "status": "en_ejecucion"
}
```

Estados: `programado`, `en_ejecucion`, `finalizado`, `cancelado`.

Transiciones permitidas:

- `programado` -> `en_ejecucion` o `cancelado`
- `en_ejecucion` -> `finalizado` o `cancelado`
- `finalizado` y `cancelado` no admiten mas cambios

Cada cambio guarda `from_status`, `to_status`, `changed_by` y `changed_at`, y queda en la auditoria con la accion `status_change`.
