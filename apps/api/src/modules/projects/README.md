# Proyectos

Modulo para proyectos aprobados, cotizaciones, avances, costos y cierre.

## Endpoints

Base: `/api/v1/projects`

| Metodo | Ruta                              | Permiso           | Descripcion                            |
| ------ | --------------------------------- | ----------------- | -------------------------------------- |
| POST   | `/buildings/:buildingId/projects` | `projects.create` | Registra un proyecto aprobado (HU-058) |
| GET    | `/buildings/:buildingId/projects` | `projects.view`   | Lista los proyectos del edificio       |

Cuerpo de registro (HU-058):

```json
{
  "name": "Reparación de cubierta Torre B",
  "objective": "Reemplazar la impermeabilización de la cubierta para evitar filtraciones.",
  "projectType": "obra",
  "budget": 61000000,
  "startDate": "2026-11-01",
  "endDate": "2027-01-30",
  "responsible": "Ana Martínez",
  "approvalReference": "Acta asamblea 12/10/2026"
}
```

- `projectType`: `obra`, `mejora`, `mantenimiento` u `otro`.
- `budget` es numérico, no negativo, con máximo dos decimales.
- La fecha de fin no puede ser anterior a la de inicio.
- El proyecto inicia en estado `aprobado`.
- Queda registrado en auditoría con el usuario y el edificio.
