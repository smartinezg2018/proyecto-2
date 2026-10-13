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
- Alertas visibles en pantalla; no se envían correos.
- HU-033 a HU-036: el registro captura número, aseguradora, vigencia, valor y coberturas.
  La fecha final debe ser posterior a la inicial. Una póliza se asocia a uno o varios
  activos del mismo edificio y aparece en el detalle de cada activo. La actualización
  modifica los campos autorizados y deja el cambio en auditoría. La consulta lista solo
  el edificio seleccionado y filtra por aseguradora, estado y fecha de vencimiento.
- Pruebas incluidas en `npm.cmd test`: fechas límite, validaciones, configuración y HTTP.

HU-038: reclamaciones

- API: GET/POST `/api/v1/insurance/buildings/:buildingId/claims`.
- Registra fecha, descripción, estado, valor reclamado y hasta 10 referencias documentales.
- Cada reclamación se relaciona con una póliza y uno o más activos del mismo edificio.
- Adjuntos: enviar multipart con `payload` (JSON) y hasta 5 archivos `documents`.
  El cliente debe enviar `X-Requested-With: XMLHttpRequest`. Se conserva el registro JSON existente.
- Cada adjunto admite hasta 5 MB. Se comparan extensión, MIME y firma binaria de PDF, PNG o JPEG.
  La firma no constituye un análisis antivirus ni una validación completa del contenido.
- Archivos privados en `apps/api/storage/claim-documents`, con identificadores aleatorios,
  fuera del directorio público y excluidos de Git. Respaldar esta carpeta junto con la base de datos.
- Descarga autenticada: GET `/api/v1/insurance/buildings/:buildingId/claims/:claimId/documents/:documentId`.
  Verifica permiso, edificio y relación documental; fuerza descarga y deshabilita caché y detección de MIME.
- Reclamación y metadatos se guardan en una transacción. Se eliminan los archivos si falla el guardado.
  Un cierre abrupto del proceso puede dejar archivos huérfanos que requieren conciliación.
- Migración nueva: `023_claim_documents.sql`. Si el ejecutor se detiene en la migración 018 ya aplicada,
  aplicar solo la 023 a la base existente; una base nueva ejecuta la secuencia completa.
- Auditoría de dependencias: se aplicaron actualizaciones compatibles; persisten dos avisos moderados
  relacionados con uuid/Sequelize. No ejecutar `npm audit fix --force` para degradar Sequelize.
