# Estrategia de pruebas automáticas — Sprint 2

## Alcance y ejecución

Esta estrategia cubre las historias **HU-023 a HU-039**. Cada historia tiene como mínimo un caso correcto y uno alternativo o de límite. Las pruebas unitarias aíslan reglas de negocio mediante repositorios simulados; las pruebas de integración ejercitan la API y una base MySQL temporal, sin utilizar ni modificar la base de desarrollo.

```powershell
docker compose up -d mysql
npm.cmd test
```

El workflow `JavaScript CI / Quality Pipeline` ejecuta el mismo comando en cada pull request hacia `main`.

## Estrategia

| Funcionalidad                                 | Tipo de prueba            | Justificación                                                                                                  |
| --------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| HU-023 Registrar mantenimiento                | Integración y unitaria    | Comprueba el registro asociado al activo y su historial, además del rechazo de activos inexistentes.           |
| HU-024 Programar mantenimiento preventivo     | Unitaria y propiedades    | Verifica cálculo de fechas con distintas frecuencias y las restricciones propias del mantenimiento preventivo. |
| HU-025 Registrar mantenimiento correctivo     | Unitaria                  | Aísla la validación de falla, causa y acciones y comprueba la relación con el activo.                          |
| HU-026 Registrar costo de mantenimiento       | Unitaria                  | Comprueba normalización, precisión, límites y que un valor inválido no se guarde.                              |
| HU-027 Registrar proveedor del mantenimiento  | Unitaria e integración    | Verifica creación o selección del proveedor, contacto, documento y referencias inexistentes.                   |
| HU-028 Consultar historial de mantenimientos  | Integración               | Comprueba orden cronológico, detalle y aislamiento entre edificios.                                            |
| HU-029 Actualizar estado del mantenimiento    | Escenario                 | Recorre el flujo de estados y valida transiciones, usuario y fecha del cambio.                                 |
| HU-030 Generar alertas de mantenimiento       | Unitaria e integración    | Controla anticipación, duplicados, atención de alertas y límites temporales.                                   |
| HU-031 Comparar cotizaciones de mantenimiento | Integración               | Comprueba persistencia y comparación de proveedor, valor, alcance y condiciones.                               |
| HU-032 Comparar cotizaciones de seguros       | Integración               | Comprueba persistencia, orden por prima y validación de vigencias.                                             |
| HU-033 Registrar póliza                       | Unitaria e integración    | Verifica todos los datos de la póliza, duplicados y coherencia de fechas.                                      |
| HU-034 Asociar póliza con activos             | Integración de contrato   | Define el contrato pendiente para asociar activos y consultar las pólizas desde su detalle.                    |
| HU-035 Actualizar póliza                      | Integración de contrato   | Define el contrato pendiente de actualización, autorización y auditoría.                                       |
| HU-036 Consultar pólizas                      | Integración de contrato   | Define los filtros pendientes y comprueba el aislamiento por edificio.                                         |
| HU-037 Alertar vencimiento de póliza          | Propiedades e integración | Evalúa límites, zona horaria y clasificación según días restantes.                                             |
| HU-038 Registrar reclamación                  | Integración y seguridad   | Verifica relaciones, documentos reales, límites de archivo, permisos y edificio.                               |
| HU-039 Consultar historial de reclamaciones   | Integración y seguridad   | Verifica filtros parametrizados, resultados, indemnización, documentos y autorización.                         |

## Trazabilidad HU–casos

| Historia | Caso correcto                                      | Caso alternativo o límite                             | Estado inicial esperado           |
| -------- | -------------------------------------------------- | ----------------------------------------------------- | --------------------------------- |
| HU-023   | CP-023-01 registra el mantenimiento asociado.      | CP-023-02 rechaza un activo inexistente.              | Aprobados                         |
| HU-024   | CP-024-01 calcula la próxima fecha.                | CP-024-02 rechaza frecuencia en un correctivo.        | Aprobados                         |
| HU-025   | CP-025-01 registra falla, causa y acciones.        | CP-025-02 rechaza datos obligatorios ausentes.        | Aprobados                         |
| HU-026   | CP-026-01 registra costos válidos.                 | CP-026-02 rechaza valores negativos.                  | Aprobados                         |
| HU-027   | CP-027-01 conserva contacto y documento.           | CP-027-02 rechaza proveedor inexistente.              | Aprobados                         |
| HU-028   | CP-028-01 devuelve el historial ordenado.          | CP-028-02 impide consultar otro edificio.             | Aprobados                         |
| HU-029   | CP-029-01 conserva estado, usuario y fecha.        | CP-029-02 rechaza una transición inválida.            | Aprobados                         |
| HU-030   | CP-030-01 genera una alerta sin duplicarla.        | CP-030-02 atiende una sola vez y valida anticipación. | Aprobados                         |
| HU-031   | CP-031-01 registra una cotización comparable.      | CP-031-02 rechaza proveedor inexistente.              | Aprobados                         |
| HU-032   | CP-032-01 registra cotización de seguro.           | CP-032-02 rechaza vigencia invertida.                 | Aprobados                         |
| HU-033   | CP-033-01 registra todos los campos.               | CP-033-02 rechaza fechas inválidas.                   | Aprobados                         |
| HU-034   | CP-034-01 asocia activos y los muestra en detalle. | CP-034-02 rechaza activos de otro edificio.           | Fallan hasta implementar contrato |
| HU-035   | CP-035-01 actualiza y audita.                      | CP-035-02 rechaza fechas y acceso inválidos.          | Fallan hasta implementar contrato |
| HU-036   | CP-036-01 combina filtros.                         | CP-036-02 rechaza filtros y accesos inválidos.        | Fallan hasta implementar contrato |
| HU-037   | CP-037-01 configura y reclasifica.                 | CP-037-02 valida extremos y valores inválidos.        | Aprobados                         |
| HU-038   | CP-038-01 registra reclamación y documentos.       | CP-038-02 rechaza relaciones de otro edificio.        | Aprobados                         |
| HU-039   | CP-039-01 muestra resultado e indemnización.       | CP-039-02 rechaza fechas inválidas.                   | Aprobados                         |

## Contratos pendientes activos

Los siguientes contratos están expresados como pruebas activas para evidenciar trabajo faltante:

- `PUT /api/v1/insurance/buildings/:buildingId/policies/:policyId/assets`, con `{ "assetIds": [...] }`.
- `PUT /api/v1/insurance/buildings/:buildingId/policies/:policyId`, con los campos autorizados de la póliza.
- `GET /api/v1/assets/:assetId`, cuya respuesta debe incluir `policies`.
- `GET /api/v1/insurance/buildings/:buildingId/policies`, con `insurer`, `status`, `expiresFrom` y `expiresTo`.

Todos deben conservar el formato `{ data, meta }`, los permisos del módulo y el control de acceso por edificio. Mientras esos contratos no existan, `npm.cmd test` debe reportar exactamente los casos CP-034, CP-035 y CP-036 como fallidos; los demás casos deben continuar ejecutándose.
