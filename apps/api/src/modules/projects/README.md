# Proyectos

Modulo para proyectos aprobados, cotizaciones, avances, costos y cierre.

## Endpoints

Base: `/api/v1/projects`

| Metodo | Ruta                              | Permiso           | Descripcion                            |
| ------ | --------------------------------- | ----------------- | -------------------------------------- |
| POST   | `/buildings/:buildingId/projects` | `projects.create` | Registra un proyecto aprobado (HU-058) |
| GET    | `/buildings/:buildingId/projects` | `projects.view`   | Lista y filtra el historial de proyectos (HU-062) |
| POST   | `/buildings/:buildingId/projects/:projectId/close` | `projects.update` | Cierra un proyecto (HU-063) |
| POST   | `/buildings/:buildingId/projects/:projectId/quotes` | `projects.update` | Registra una cotización del proyecto (HU-059) |
| GET    | `/buildings/:buildingId/projects/:projectId/quotes` | `projects.view` | Lista las cotizaciones del proyecto |
| POST   | `/buildings/:buildingId/projects/:projectId/quotes/selection` | `projects.update` | Selecciona la cotización ganadora (HU-060) |
| POST   | `/buildings/:buildingId/projects/:projectId/progress` | `projects.update` | Registra un avance del proyecto (HU-061) |
| GET    | `/buildings/:buildingId/projects/:projectId/progress` | `projects.view` | Lista el historial de avances |

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

Cuerpo de cotización (HU-059):

```json
{
  "supplierId": 2,
  "amount": 58500000,
  "validUntil": "2026-11-30",
  "scope": "Impermeabilización completa de la cubierta, incluyendo desmonte y pruebas.",
  "conditions": "Pago 40% anticipo y 60% contra entrega. Garantía de 2 años.",
  "deliveryDays": 60,
  "documentRef": "cotizacion-cubierta.pdf"
}
```

- Se pueden registrar varias cotizaciones para el mismo proyecto.
- `amount` es numérico, no negativo, con máximo dos decimales.
- `deliveryDays` es el tiempo de ejecución en días.
- `conditions` describe forma de pago, garantías u otras condiciones.
- `documentRef` es opcional y guarda la referencia del documento recibido.
- La cotización queda relacionada con el proyecto y el proveedor.

Cuerpo de selección (HU-060):

```json
{
  "quoteId": 1,
  "justification": "Mejor relación precio-garantía para el alcance aprobado."
}
```

- La comparación muestra precio, alcance, tiempo y condiciones.
- Se necesitan al menos dos cotizaciones para seleccionar.
- Quedan guardadas la propuesta elegida y la justificación.

Cuerpo de avance (HU-061):

```json
{
  "quoteId": 1,
  "progressDate": "2026-11-15",
  "percentage": 35,
  "executedCost": 18200000,
  "observations": "Se completó el desmonte de la cubierta antigua.",
  "evidenceRef": "informe-avance-1.pdf"
}
```

- Cada avance se agrega al historial; no reemplaza registros anteriores.
- `quoteId` identifica la cotización y el proveedor que ejecutó ese porcentaje.
- El proveedor queda guardado en el avance, aunque después se cambie la cotización seleccionada.
- `percentage` está entre 0 y 100, con máximo dos decimales.
- El primer avance cambia el estado del proyecto de `aprobado` a `en_ejecucion`.
- No se puede registrar avance en un proyecto `finalizado` o `cancelado`.

Consulta del historial (HU-062):

- El edificio se toma de la ruta.
- Filtros opcionales: `status`, `projectType`, `dateFrom` y `dateTo` (sobre la fecha de inicio).
- El detalle incluye cotizaciones, avances, costo ejecutado y datos de cierre.

Cuerpo de cierre (HU-063):

```json
{
  "closeDate": "2027-01-28",
  "totalCost": 57200000,
  "result": "Se restableció la impermeabilización de la cubierta sin filtraciones.",
  "closingDocumentRef": "acta-cierre-cubierta.pdf"
}
```

- `totalCost` es numérico, no negativo, con máximo dos decimales.
- El estado pasa a `finalizado` y la información queda disponible para consulta.
- No se puede cerrar un proyecto `finalizado` o `cancelado`.
