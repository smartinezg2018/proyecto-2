# Mantenimientos

Modulo para mantenimientos preventivos, correctivos, costos, proveedores y alertas.

## Endpoints

Base: `/api/v1/maintenance`

| Metodo | Ruta                                          | Permiso              | Descripcion                                          |
| ------ | --------------------------------------------- | -------------------- | ---------------------------------------------------- |
| POST   | `/assets/:assetId/maintenances`               | `maintenance.create` | Registra un mantenimiento sobre un activo            |
| GET    | `/assets/:assetId/maintenances`               | `maintenance.view`   | Historial cronológico de un activo (HU-028)          |
| GET    | `/buildings/:buildingId/maintenances`         | `maintenance.view`   | Lista los mantenimientos de los activos del edificio |
| GET    | `/maintenances/:maintenanceId`                | `maintenance.view`   | Detalle, costos, proveedor y programación            |
| PATCH  | `/maintenances/:maintenanceId/status`         | `maintenance.update` | Actualiza el estado de un mantenimiento              |
| GET    | `/maintenances/:maintenanceId/status-history` | `maintenance.view`   | Lista fecha y usuario de cada cambio de estado       |
| PATCH  | `/maintenances/:maintenanceId/costs`          | `maintenance.update` | Registra o corrige el costo estimado y el real       |
| GET    | `/buildings/:buildingId/alert-settings`       | `maintenance.view`   | Anticipación de alertas del edificio (HU-030)        |
| PUT    | `/buildings/:buildingId/alert-settings`       | `maintenance.update` | Configura días de anticipación (0 a 365)             |
| GET    | `/buildings/:buildingId/alerts`               | `maintenance.view`   | Genera y lista alertas persistentes                  |
| PATCH  | `/alerts/:alertId/attend`                     | `maintenance.update` | Marca una alerta como atendida                       |

Cuerpo de registro preventivo:

```json
{
  "maintenanceType": "preventivo",
  "maintenanceDate": "2026-01-15",
  "description": "Revision general de cables y frenos",
  "frequency": "mensual",
  "responsible": "Ana Martinez",
  "nextExecutionDate": "2026-02-15"
}
```

Programacion preventiva (HU-024):

- `frequency` es opcional. Valores: `unica`, `semanal`, `quincenal`, `mensual`, `trimestral`, `semestral`, `anual`.
- Si hay `frequency`, `responsible` es obligatorio.
- `maintenanceDate` es la **fecha de ejecución** (cuándo se debe hacer). La alerta usa esta fecha, no la de registro (`createdAt`).
- `nextExecutionDate` es opcional; si se omite, se calcula a partir de la fecha de ejecución y la frecuencia.
- La fecha de ejecución puede ser futura en preventivos y en correctivos.

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
- `maintenanceDate`: `YYYY-MM-DD`. Puede ser futura.
- Para `preventivo`: `description` es obligatoria.
- `GET /assets/:assetId/maintenances` devuelve el historial en orden cronológico inverso (más reciente primero) e incluye costos, proveedor, cotizaciones/evidencias al abrir el detalle.
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

Costos del mantenimiento (HU-026):

`estimatedCost` y `actualCost` son opcionales al registrar el mantenimiento y se pueden registrar o corregir despues:

```json
{
  "estimatedCost": 1500000,
  "actualCost": 1725000.5
}
```

- Ambos valores deben ser numericos, no negativos, con maximo dos decimales (columnas `DECIMAL(15, 2)`).
- En el `PATCH` se debe enviar al menos uno de los dos campos; el campo omitido conserva su valor y `null` lo borra.
- Cada actualizacion queda en la auditoria con la accion `cost_update` y los valores anteriores (`before`) y nuevos (`after`).

Alertas de mantenimiento (HU-030):

```json
{
  "alertDays": 7
}
```

- `alertDays` es un entero entre 0 y 365. El valor por defecto del edificio es 7.
- `GET /alerts` genera alertas para preventivos y correctivos `programado` o `en_ejecucion` cuya fecha de ejecución cae dentro de la anticipación. `UNIQUE(maintenance_id, target_date)` evita duplicados.
- `PATCH /alerts/:alertId/attend` marca la alerta como `atendida`. Si ya lo estaba, responde 409.
