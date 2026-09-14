# Mapa de pruebas unitarias ↔ backlog (EP-01 y EP-02)

Documento que resume qué hace cada prueba en `apps/api/tests/` y la relaciona con las historias **HU-001 a HU-022** del [Backlog provisional](../backlog/Backlog_provisional.md) (líneas 82–154).

**Cómo se ejecutan:** `npm test` (equivale a `node --test` en `apps/api`).

**Tipos de prueba**

| Tipo | Descripción |
| ---- | ----------- |
| Caso de uso | Lógica de aplicación con repositorios en memoria (mocks). |
| HTTP | Servidor Express real en puerto efímero, repositorios mockeados. |
| Middleware | Autorización y acceso por edificio. |
| Repositorio | Traducción de errores MySQL / transacciones (mocks). |
| Integración MySQL | Requiere `TEST_DB_NAME`; se omite si no está configurado. |

---

## Resumen de cobertura por historia

| HU | Título | Cubierta por tests unitarios | Archivos |
| -- | ------ | ---------------------------- | -------- |
| HU-001 | Registrar edificio | Sí | `buildingUseCases.test.js` |
| HU-002 | Consultar edificios | Parcial (no valida listado “solo asignados”) | — |
| HU-003 | Actualizar edificio | Sí | `buildingUseCases.test.js` |
| HU-004 | Crear perfiles de usuario | Sí | `profileUseCases.test.js`, `profileRepository.test.js`, `profiles.integration.test.js` |
| HU-005 | Registrar usuario administrativo | Sí | `userUseCases.test.js`, `userRepository.test.js`, `users.http.test.js`, `users.integration.test.js` |
| HU-006 | Asignar roles y permisos | Sí | `userAssignments.test.js`, `authorization.test.js`, `auth.http.test.js` |
| HU-007 | Asignar edificios al usuario | Sí | `userAssignments.test.js`, `authorization.test.js` |
| HU-008 | Iniciar sesión | Sí | `auth.http.test.js` |
| HU-009 | Consultar auditoría | Sí | `auditUseCases.test.js`, `userAssignments.test.js` |
| HU-010 | Registrar apartamento o unidad | Sí | `unitUseCases.test.js` |
| HU-011 | Registrar responsable | Sí | `personUseCases.test.js` |
| HU-012 | Registrar activo | Sí | `assetUseCases.test.js` |
| HU-013 | Consultar activos | Sí | `assetUseCases.test.js` |
| HU-014 | Actualizar activo | Sí | `assetUseCases.test.js` |
| HU-015 | Cambiar estado del activo | Sí | `assetUseCases.test.js` |
| HU-016 | Consultar historial del activo | Sí | `assetUseCases.test.js` |
| HU-017 | Consultar detalle del activo | No | — |
| HU-018 | Registrar proveedor del activo | No | — |
| HU-019 | Registrar costo de adquisición | No | — |
| HU-020 | Consultar costos del activo | No | — |
| HU-021 | Clasificar activo | Parcial (tipo obligatorio al crear) | `assetUseCases.test.js` |
| HU-022 | Buscar activos | No | — |

> Las HU-017 a HU-020 y HU-022 están implementadas en la aplicación y se demuestran en la guía funcional / scripts de `apps/api/scripts/`, pero **aún no tienen `*.test.js` dedicados**.

---

## Detalle por archivo de prueba

### `buildingUseCases.test.js` — edificios

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| registra un edificio y conserva el usuario creador | Captura nombre, NIT, dirección y teléfono; guarda `createdBy` | **HU-001** · SR-001.1 |
| rechaza edificios con NIT duplicado | Impide duplicados (`DUPLICATE_BUILDING` 409) | **HU-001** · SR-001.2 |
| actualiza datos y conserva el usuario que modifica | Modifica datos autorizados y registra `updatedBy` | **HU-003** · SR-003.1, SR-003.2 |

---

### `profileUseCases.test.js` — perfiles

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| crea un perfil con nombre y descripción, sin permisos | Alta de perfil con nombre y descripción | **HU-004** · SR-004.1 |
| asocia funcionalidades sin duplicarlas | Selección de permisos/funcionalidades | **HU-004** · SR-004.2 |
| rechaza nombres ausentes, vacíos o demasiado largos | Validación de campos obligatorios | **HU-004** · SR-004.1 |
| rechaza descripciones e identificadores inválidos antes de guardar | Validación previa a persistir | **HU-004** · SR-004.1, SR-004.2 |

---

### `profileRepository.test.js` — perfiles (persistencia)

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| rechaza permisos inexistentes sin insertar un perfil y libera la conexión | No guarda perfil si un permiso no existe; libera conexión | **HU-004** · SR-004.2 |
| revierte la transacción si falla la escritura de una asociación | Atomicidad al asociar funcionalidades | **HU-004** · SR-004.2 |

---

### `profiles.integration.test.js` — perfiles (MySQL)

| Caso de prueba | Qué verifica | HU / SR | Nota |
| -------------- | ------------ | ------- | ---- |
| persiste perfiles y asociaciones en MySQL y rechaza permisos inexistentes | Persistencia real y rechazo de permisos inválidos | **HU-004** · SR-004.1, SR-004.2 | Se omite sin `TEST_DB_NAME` |

---

### `userUseCases.test.js` — usuarios

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| registra los cuatro campos del usuario y conserva el creador | Identificación, nombre, correo y estado; `createdBy` | **HU-005** · SR-005.1 |
| normaliza espacios y correo y permite registrar un usuario inactivo | Normalización y estado inactivo | **HU-005** · SR-005.1 |
| rechaza el correo duplicado incluso con mayúsculas y espacios | Unicidad de correo | **HU-005** · SR-005.2 |
| rechaza la identificación duplicada aunque el correo sea diferente | Unicidad de identificación | **HU-005** · SR-005.2 |
| valida todos los campos obligatorios y sus límites antes de consultar la base | Validación previa a BD | **HU-005** · SR-005.1 |

---

### `userRepository.test.js` — usuarios (errores MySQL)

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| traduce violaciones de unicidad de MySQL a errores 409 | Correo/identificación duplicados → conflicto | **HU-005** · SR-005.2 |
| propaga fallos inesperados de MySQL al middleware existente | Errores no controlados no se silencian | **HU-005** (soporte) |

---

### `users.http.test.js` — usuarios (HTTP)

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| HTTP: registro 201, validación 400, duplicados 409 y errores 500 | Contrato HTTP del registro de usuario | **HU-005** · SR-005.1, SR-005.2 |

---

### `users.integration.test.js` — usuarios (MySQL)

| Caso de prueba | Qué verifica | HU / SR | Nota |
| -------------- | ------------ | ------- | ---- |
| MySQL: persiste usuarios y protege correo e identificación incluso en registros simultáneos | Unicidad bajo concurrencia | **HU-005** · SR-005.2 | Se omite sin `TEST_DB_NAME` |

---

### `userAssignments.test.js` — roles, perfiles y edificios

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| assignProfiles guarda los identificadores y registra auditoría | Asigna perfiles y deja traza de auditoría | **HU-006** · SR-006.1 · **HU-009** · SR-009.1 |
| assignBuildings rechaza edificios inexistentes | Solo edificios válidos | **HU-007** · SR-007.1 |
| assignProfiles valida el tipo de la lista | Validación de entrada de perfiles | **HU-006** · SR-006.1 |
| listProfiles/listBuildings falla si el usuario no existe | Consultas de asignación sobre usuario inexistente | **HU-006**, **HU-007** |

---

### `authorization.test.js` — permisos y acceso por edificio

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| requirePermission permite pasar cuando el permiso está presente | Permisos aplicados en operaciones | **HU-006** · SR-006.2 |
| requirePermission permite el bypass con admin.all | Administrador general con acceso total | **HU-006** · SR-006.2 |
| requirePermission responde 403 cuando falta el permiso | Bloqueo sin permiso | **HU-006** · SR-006.2 |
| ensureBuildingAccess rechaza acceso cuando no está asignado | Impide operar edificios no asignados | **HU-007** · SR-007.2 |
| ensureBuildingAccess permite acceso cuando el usuario tiene admin.all | Bypass de edificio para admin | **HU-007** · SR-007.2 |

---

### `auth.http.test.js` — sesión

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| HTTP: login valida credenciales y estado, y logout revoca la sesión | Login OK, cookie HttpOnly, `/me` con permisos, 401 por credenciales, 403 por inactivo, logout | **HU-008** · SR-008.1, SR-008.2 · **HU-006** · SR-006.2 |

---

### `auditUseCases.test.js` — auditoría

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| list aplica filtros por defecto y devuelve paginación | Listado con paginación y filtros por defecto | **HU-009** · SR-009.2 |
| list valida enteros y rango de fechas | Validación de filtros (usuario, fechas) | **HU-009** · SR-009.2 |
| list limita pageSize al máximo permitido | Tope de tamaño de página | **HU-009** · SR-009.2 |

---

### `unitUseCases.test.js` — inmuebles / unidades

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| registra un apartamento asociado a un edificio | Número, torre/bloque, coeficiente y estado | **HU-010** · SR-010.1 |
| registra un parqueadero como inmueble | Otro tipo de unidad bajo el mismo flujo | **HU-010** · SR-010.1 |
| rechaza inmuebles duplicados dentro del mismo edificio | Unicidad de identificación por edificio | **HU-010** · SR-010.2 |
| rechaza un inmueble cuando el edificio no existe | Asociación válida a edificio | **HU-010** · SR-010.1 |

---

### `personUseCases.test.js` — responsables

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| registra un responsable y lo asocia a varios inmuebles sin credenciales | Identificación, nombre, contacto; sin password; varias unidades | **HU-011** · SR-011.1, SR-011.2 |
| reutiliza un responsable existente y no le crea acceso | Misma persona en más unidades sin credenciales | **HU-011** · SR-011.2 |

---

### `assetUseCases.test.js` — activos

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| registra un activo asociado obligatoriamente a un edificio | Código, nombre, descripción, tipo, estado, fecha; `buildingId` obligatorio | **HU-012** · SR-012.1, SR-012.2 · **HU-021** · SR-021.2 |
| consulta únicamente los activos del edificio seleccionado | Aislamiento por edificio | **HU-013** · SR-013.1, SR-013.2 |
| actualiza campos autorizados y registra los valores modificados | Campos editables + historial de valores (usuario/fecha implícitos en historial) | **HU-014** · SR-014.1, SR-014.2 |
| cambia el estado del activo y conserva motivo y fecha | Estados operativos + motivo | **HU-015** · SR-015.1, SR-015.2 |
| consulta el historial del activo en orden cronológico | Creación y cambio de estado en secuencia | **HU-016** · SR-016.1, SR-016.2 |

---

### `health.test.js` — salud de la app

| Caso de prueba | Qué verifica | HU / SR |
| -------------- | ------------ | ------- |
| la aplicacion expone el modulo de salud | La app Express se instancia correctamente | Transversal (sin HU del backlog 001–022) |

---

## Brechas respecto al backlog 82–154

| Brecha | Detalle |
| ------ | ------- |
| **HU-002** | No hay prueba que valide el listado filtrado por edificios asignados al usuario ni la apertura de detalle. |
| **HU-017** | No hay prueba del detalle con información técnica/económica ni relaciones con proveedor, mantenimientos y pólizas. |
| **HU-018** | No hay pruebas de alta/selección de proveedor ni de la relación con el activo. |
| **HU-019** | No hay pruebas de costo de adquisición ni de validación de valor no negativo. |
| **HU-020** | No hay pruebas de consolidación ni de filtros por tipo/periodo de costos. |
| **HU-021** | Solo se exige `type` al crear el activo; no hay administración de catálogo de tipos. |
| **HU-022** | No hay pruebas de búsqueda por código/nombre ni de filtros combinados edificio · tipo · estado. |

Estas historias pueden validarse hoy con la [guía de demostración](../../GUIA_DEMOSTRACION.md) y los scripts `apps/api/scripts/functional-sprint1.mjs` / `functional-hard-cases.mjs`, fuera del runner `npm test`.

---

## Matriz inversa rápida (HU → archivos)

```text
HU-001  →  buildingUseCases.test.js
HU-002  →  (sin cobertura unitaria)
HU-003  →  buildingUseCases.test.js
HU-004  →  profileUseCases.test.js, profileRepository.test.js, profiles.integration.test.js
HU-005  →  userUseCases.test.js, userRepository.test.js, users.http.test.js, users.integration.test.js
HU-006  →  userAssignments.test.js, authorization.test.js, auth.http.test.js
HU-007  →  userAssignments.test.js, authorization.test.js
HU-008  →  auth.http.test.js
HU-009  →  auditUseCases.test.js, userAssignments.test.js
HU-010  →  unitUseCases.test.js
HU-011  →  personUseCases.test.js
HU-012  →  assetUseCases.test.js
HU-013  →  assetUseCases.test.js
HU-014  →  assetUseCases.test.js
HU-015  →  assetUseCases.test.js
HU-016  →  assetUseCases.test.js
HU-017  →  (sin cobertura unitaria)
HU-018  →  (sin cobertura unitaria)
HU-019  →  (sin cobertura unitaria)
HU-020  →  (sin cobertura unitaria)
HU-021  →  assetUseCases.test.js (parcial)
HU-022  →  (sin cobertura unitaria)
```
