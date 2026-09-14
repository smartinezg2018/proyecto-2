# Resultados de ejecución — Sprint 1

**Fecha:** 13 de septiembre de 2026  
**Versión:** `4b3756ace2f03e8f5851fce5a27b34f36a9cfb5b`  
**Entorno:** Node.js 24.21.0, MySQL 8.4 en Docker y base aislada `codex_functional_sprint1_20260913`  
**Ejecución:** `node apps/api/scripts/functional-sprint1.mjs`

## Resultado

| Historia         | Casos ejecutados                           | Aprobados | Fallidos |
| ---------------- | ------------------------------------------ | --------: | -------: |
| HU-001           | CP-001-01, CP-001-02, CP-001-03            |         3 |        0 |
| HU-002           | CP-002-01, CP-002-02                       |         2 |        0 |
| HU-003           | CP-003-01, CP-003-02                       |         2 |        0 |
| HU-004           | CP-004-01, CP-004-02                       |         2 |        0 |
| HU-005           | CP-005-01, CP-005-02, CP-005-03            |         3 |        0 |
| HU-006           | CP-006-01, CP-006-02                       |         2 |        0 |
| HU-007           | CP-007-01, CP-007-02                       |         2 |        0 |
| HU-008           | CP-008-01, CP-008-02, CP-008-03, CP-008-04 |         4 |        0 |
| HU-009           | CP-009-01, CP-009-02                       |         2 |        0 |
| HU-010           | CP-010-01, CP-010-02, CP-010-03            |         3 |        0 |
| HU-011           | CP-011-01, CP-011-02                       |         2 |        0 |
| HU-012           | CP-012-01, CP-012-02                       |         2 |        0 |
| HU-013           | CP-013-01, CP-013-02                       |         2 |        0 |
| HU-014           | CP-014-01, CP-014-02                       |         2 |        0 |
| HU-015           | CP-015-01, CP-015-02                       |         2 |        0 |
| HU-016           | CP-016-01                                  |         1 |        0 |
| **Total básico** | **36 casos**                               |    **36** |    **0** |

Se validaron creación, consulta, actualización, campos obligatorios, duplicados, asignación de perfiles y edificios, permisos 403, autenticación, cierre de sesión, auditoría, inmuebles, responsables, activos e historial.

## Comprobaciones técnicas adicionales

| Comprobación                                  | Resultado                            |
| --------------------------------------------- | ------------------------------------ |
| Migraciones de base de datos                  | Aprobada: 13 archivos aplicados      |
| Datos semilla                                 | Aprobada                             |
| ESLint                                        | Aprobada, sin errores                |
| Compilación del frontend                      | Aprobada: 2466 módulos transformados |
| Pruebas incluidas originalmente en `npm test` | El proyecto reportó 0 pruebas        |

## Casos que fallaron

| Caso      | Resultado esperado                                  | Resultado real                            | Estado y defecto                                                           |
| --------- | --------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| CP-005-04 | El correo `correo-sin-formato` debe responder 400.  | Respondió 201 y creó el usuario.          | **Fallido:** falta validar el formato del correo administrativo.           |
| CP-012-03 | La fecha imposible `2026-02-31` debe responder 400. | Respondió 500 `ER_TRUNCATED_WRONG_VALUE`. | **Fallido:** se valida la forma `YYYY-MM-DD`, pero no que la fecha exista. |

**Resultado acumulado:** 38 casos ejecutados, 36 aprobados y 2 fallidos. Se identificaron dos defectos. Todavía no se han creado las issues de bug en GitHub.

## Evidencia manual pendiente

La ejecución fue funcional sobre endpoints reales y persistencia MySQL, pero no genera capturas de navegador. Para cumplir completamente la guía académica se deben repetir los recorridos principales desde la interfaz, adjuntar capturas y completar `Registro_ejecucion_Sprint_1.csv`. Esta pendiente no representa un fallo del producto.
