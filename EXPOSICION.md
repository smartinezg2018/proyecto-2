# Exposición del proyecto — 12 diapositivas

Plan de una exposición de aproximadamente 20–25 minutos que articula el caso de negocio, la arquitectura implementada y la demostración funcional de las historias **HU-001 a HU-022** (épicas **EP-01 Administración y acceso** y **EP-02 Activos**).

> Duración sugerida: 1.5–2.5 min por diapositiva (~25 min + demo en vivo).
> Presentador único, con demo en `http://localhost:3000` a partir de la diapositiva 7.

---

## Diapositiva 1 — Portada

**Título:** Sistema de gestión administrativa de edificios y copropiedades
**Subtítulo:** Sprint 1 — Administración, acceso y activos (EP-01 y EP-02)

**Contenido visual**

- Logo/nombre del equipo.
- Integrantes y roles.
- Fecha, materia y sprint.
- Una frase gancho: *"Un solo lugar para administrar edificios, activos, seguros, cartera y presupuesto."*

**Guion (30 s):** presentación breve del equipo y del objetivo de la exposición.

---

## Diapositiva 2 — El problema y el mercado

**Título:** Un negocio con información dispersa

**Contenido**

- Los administradores de edificios gestionan hoy sus procesos en herramientas separadas: hojas de cálculo, documentos y sistemas puntuales.
- Consecuencias: información desactualizada, doble digitación, poca trazabilidad, decisiones tardías.
- **Segmento objetivo:** edificios residenciales y copropiedades con inventario de activos, mantenimientos, pólizas, cartera y presupuesto.
- **Cliente objetivo:** administrador del edificio (único perfil en el alcance inicial).
- **Mercado potencial:** empresas administradoras de propiedades (expansión futura).

**Visual:** diagrama simple *"antes vs. ahora"* con múltiples herramientas convergiendo en una sola plataforma.

---

## Diapositiva 3 — Misión, visión y propuesta de valor

**Título:** Qué construimos y por qué

**Contenido**

- **Misión:** proporcionar una herramienta centralizada que permita organizar, consultar y controlar la información administrativa y financiera de una copropiedad.
- **Visión:** evolucionar hacia una plataforma integral con múltiples perfiles y automatización de más procesos.
- **Propuesta de valor:**
  - Centralización de activos, mantenimientos, seguros, facturación, presupuesto y proyectos.
  - **Trazabilidad**: cada operación queda auditada.
  - **Panel general** con indicadores y alertas (pólizas por vencer, mantenimientos pendientes, mora).
  - Reducción de dependencia de procesos manuales.

**Visual:** tres columnas — *Centralización · Trazabilidad · Decisiones informadas*.

---

## Diapositiva 4 — Alcance de esta entrega

**Título:** Qué demostramos hoy (HU-001 a HU-022)

**Contenido**

- **EP-01 · Administración y acceso** (HU-001 a HU-011):
  - Edificios, perfiles, usuarios, roles/permisos, asignación de edificios, login, auditoría, inmuebles y responsables.
- **EP-02 · Activos** (HU-012 a HU-022):
  - Registro, consulta, actualización, cambio de estado, historial y detalle del activo.
  - Proveedores, costo de adquisición, consulta consolidada de costos, clasificación y búsqueda.

**Tabla-resumen**

| Épica | HU cubiertas | Estado |
|-------|--------------|--------|
| EP-01 Administración y acceso | HU-001 … HU-011 | Implementadas |
| EP-02 Activos                 | HU-012 … HU-020 | Implementadas |
| EP-02 Activos                 | HU-021, HU-022  | Parcial: tipos y búsqueda embebidos en catálogo/listado |
| EP-03 a EP-07                 | HU-023 … HU-063 | Pendientes (próximos sprints) |

---

## Diapositiva 5 — Arquitectura de la solución

**Título:** Monolito modular · React + Express + MySQL

**Contenido**

- Monolito modular con módulos aislados por dominio (`administration`, `assets`, `auth`, `billing`, `budget`, `insurance`, `maintenance`, `projects`).
- **Frontend:** React (`apps/web`), organizado por `features`.
- **Backend:** Node.js + Express (`apps/api`), 4 capas por módulo: `domain`, `application`, `infrastructure`, `presentation`.
- **Persistencia:** MySQL con `mysql2` parametrizado + ORM para catálogos.
- **Sesión:** cookie `HttpOnly`; autorización por rol, permiso **y edificio asignado**.
- **Auditoría** transversal en cada operación relevante.

**Visual:** diagrama de flujo (Administrador → React → Express → Casos de uso → Repositorios → MySQL, con ramas a Auditoría y Alertas).

---

## Diapositiva 6 — Calidad de software y CI

**Título:** Cómo protegemos el trunk

**Contenido**

- **Estrategia de ramas:** Trunk-Based Development, ramas cortas (<48 h), feature flags.
- **Estándares:** Airbnb JS Style Guide — `camelCase`, `UpperCamelCase`, `UPPER_SNAKE_CASE`.
- **Análisis y formato:** ESLint (perfil estricto) + Prettier + Husky/Lint-Staged (pre-commit).
- **CI (GitHub Actions):** en cada PR a `main` se ejecuta `prettier --check`, `npm run lint`, `npm test`.
- **Protección de rama:** sin push directo a `main`, pipeline verde obligatorio y al menos un *approve*.

**Visual:** diagrama del pipeline `PR → Prettier → ESLint → Tests → Review → Merge`.

---

## Diapositiva 7 — Demo (1/4) · Acceso y seguridad

**Título:** Autenticación, perfiles y permisos

**HU cubiertas:** HU-004, HU-005, HU-006, HU-008

**Guion de demo**

1. **Login (HU-008):** ingresar con `admin@example.com` / `Admin123!`. Mostrar rechazo con usuario inactivo (SR-008.1) y cierre de sesión (SR-008.2).
2. **Perfiles (HU-004):** crear un perfil, capturar nombre y descripción, marcar permisos (SR-004.1, SR-004.2).
3. **Usuarios (HU-005):** registrar un usuario; repetir correo para demostrar la validación de unicidad (SR-005.2).
4. **Roles/permisos (HU-006):** asignar perfiles al usuario y mostrar cómo cambia el menú lateral al iniciar sesión con él (SR-006.2).

**Puntos a resaltar:** cookies `HttpOnly`, verificación de permisos en backend y auditoría automática.

---

## Diapositiva 8 — Demo (2/4) · Edificios, inmuebles y responsables

**Título:** El contexto del administrador

**HU cubiertas:** HU-001, HU-002, HU-003, HU-007, HU-010, HU-011

**Guion de demo**

1. **Registrar edificio (HU-001):** capturar nombre, NIT, dirección, teléfono, correo (SR-001.1). Intentar duplicar NIT (SR-001.2).
2. **Consultar edificios (HU-002):** listado filtrado por edificios asignados al usuario; abrir detalle (SR-002.1, SR-002.2).
3. **Actualizar edificio (HU-003):** editar dirección o teléfono; se conserva usuario y fecha (SR-003.2).
4. **Asignar edificios al usuario (HU-007):** seleccionar edificios permitidos y verificar restricción al iniciar sesión con el usuario (SR-007.1, SR-007.2).
5. **Inmuebles (HU-010) y responsables (HU-011):** registrar unidad con torre/coeficiente y validación de unicidad; asociar responsable sin credenciales (SR-011.2).

**Punto a resaltar:** el edificio es el eje de autorización — sin edificio asignado, no hay visibilidad.

---

## Diapositiva 9 — Demo (3/4) · Activos: ciclo básico

**Título:** Registrar, consultar, actualizar y cambiar estado

**HU cubiertas:** HU-012, HU-013, HU-014, HU-015, HU-021, HU-022

**Guion de demo**

1. **Registrar activo (HU-012):** capturar código, nombre, descripción, tipo, estado, ubicación y fecha de adquisición (SR-012.1); asociación obligatoria al edificio (SR-012.2).
2. **Clasificar por tipo (HU-021):** mostrar el catálogo de tipos usado al registrar (SR-021.1, SR-021.2).
3. **Consultar activos (HU-013):** tabla filtrada por edificio, columnas código/nombre/tipo/estado/ubicación (SR-013.1, SR-013.2).
4. **Buscar y filtrar (HU-022):** buscar por código/nombre y combinar filtros edificio · tipo · estado (SR-022.1, SR-022.2).
5. **Actualizar (HU-014):** editar campos permitidos; queda registrado usuario y fecha (SR-014.2).
6. **Cambiar estado (HU-015):** pasar a *En mantenimiento* / *Fuera de servicio* / *Retirado* con motivo (SR-015.1, SR-015.2).

---

## Diapositiva 10 — Demo (4/4) · Activos: detalle, proveedor y costos

**Título:** Historial, proveedor y economía del activo

**HU cubiertas:** HU-016, HU-017, HU-018, HU-019, HU-020

**Guion de demo**

1. **Detalle del activo (HU-017):** panel con información técnica, económica y administrativa (SR-017.1).
2. **Historial (HU-016):** cambios de información y de estado en orden cronológico con usuario y fecha (SR-016.1, SR-016.2).
3. **Proveedor (HU-018):** demostrar las dos vías — registrar nuevo (SR-018.2) y seleccionar existente (SR-018.1).
4. **Costo de adquisición (HU-019):** capturar valor, fecha y documento; **intentar valor negativo** para mostrar la validación (SR-019.2).
5. **Costos consolidados (HU-020):** registrar 1–2 costos de operación; resumen **Total / Operación / Adquisición** (SR-020.1); filtros por tipo y por rango de fechas (SR-020.2).

**Aparte técnico (30 s):** mostrar la llamada respaldo por API:

```powershell
curl.exe -b cookies.txt "http://localhost:5000/api/v1/assets/5/costs/summary?from=2025-01-01&to=2025-12-31"
```

---

## Diapositiva 11 — Auditoría y trazabilidad

**Título:** Cada cambio deja huella (HU-009)

**Contenido**

- Menú **Auditoría** (visible para `admin` / `auditor`).
- Tabla con usuario, fecha, operación, entidad y edificio (SR-009.1).
- Filtros por usuario, fecha, módulo y edificio (SR-009.2).
- Recorrer las entradas generadas durante la demo: edificios, usuarios, activos, proveedores, costos.

**Mensaje clave**

- La auditoría es **transversal** y automática: no depende del programador de cada módulo.
- Habilita cumplimiento, soporte y análisis retrospectivo.

**Visual:** captura de la pantalla de auditoría con filtros aplicados.

---

## Diapositiva 12 — Cierre, pendientes y próximos pasos

**Título:** Qué logramos y hacia dónde vamos

**Contenido**

- **Logrado en este sprint**
  - 22 historias de usuario implementadas (EP-01 completa, EP-02 con núcleo funcional).
  - Arquitectura monolítica modular estable, con auditoría y control de acceso por edificio.
  - Pipeline de calidad activo (Prettier + ESLint + tests en CI, protección de rama).
- **Pendientes conscientes**
  - HU-017 muestra proveedor y costos, pero **relaciones con mantenimientos y pólizas** dependen de EP-03 y EP-04.
- **Próximos sprints (orden recomendado)**
  1. EP-03 Mantenimientos y alertas.
  2. EP-04 Seguros y reclamaciones.
  3. EP-05 Facturación, pagos, cartera e intereses.
  4. EP-06 Presupuesto y ejecución.
  5. EP-07 Proyectos, cotizaciones y cierre.
- **Cierre:** invitación a preguntas y espacio para retroalimentación de la Product Owner.

**Visual:** roadmap horizontal EP-01/EP-02 (verde) → EP-03…EP-07 (gris/azul), con marca del sprint actual.

---

## Anexos sugeridos (opcionales, fuera de las 12)

- Diagrama ER de alto nivel (`Building ↔ Unit ↔ Asset ↔ Supplier ↔ AssetCost`).
- Mapa de menú por perfil (extraído de `docs/DATOS_PRUEBA.md`).
- Tabla completa de cobertura HU (extraída de `GUIA_DEMOSTRACION.md § 8`).
