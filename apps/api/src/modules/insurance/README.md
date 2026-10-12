# Seguros

Modulo para polizas, coberturas, vencimientos, cotizaciones y reclamaciones.

HU-037: alertas de vencimiento

- Ejecutar `npm.cmd run db:migrate` con MySQL disponible (migración 021).
- En Seguros → Pólizas Registradas, seleccionar edificio y registrar una póliza.
- La anticipación se guarda por edificio: 30 días por defecto, entero entre 0 y 365.
- Vencida: fecha final anterior a hoy. Próxima a vencer: de hoy hasta el límite incluido.
- Vigente: vence después del límite. Pendiente de inicio: todavía no comienza su vigencia.
- El cálculo usa el día calendario en America/Bogota y se actualiza al consultar.
- API: GET/POST `/api/v1/insurance/buildings/:buildingId/policies`;
  GET/PUT `/api/v1/insurance/buildings/:buildingId/alert-settings` (cuerpo: `{"alertDays":30}`).
- Consulta: `insurance.view`. Registro/configuración: `insurance.update`.
  Todas las operaciones verifican sesión y acceso al edificio.
- Alertas visibles en pantalla; no se envían correos. El registro es básico,
  sin flujo de renovación ni asociación de activos.
- Pruebas incluidas en `npm.cmd test`: fechas límite, validaciones, configuración y HTTP.
