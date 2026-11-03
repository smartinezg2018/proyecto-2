# Guía de usuario — Sistema de gestión administrativa de edificios

Esta guía explica, paso a paso, cómo usar cada uno de los módulos principales de la aplicación. Está escrita para administradores, operadores y auditores que ya tengan la aplicación corriendo localmente (o en un entorno equivalente).

> **Antes de empezar.** Si todavía no has levantado el sistema, sigue las instrucciones de instalación del [README.md](../README.md). Los usuarios y edificios de prueba están en [DATOS_PRUEBA.md](DATOS_PRUEBA.md).

---

## Índice

1. [Convenciones de esta guía](#1-convenciones-de-esta-guía)
2. [Primer inicio de sesión y recorrido general](#2-primer-inicio-de-sesión-y-recorrido-general)
3. [Panel General](#3-panel-general)
4. [Edificios](#4-edificios)
5. [Inmuebles](#5-inmuebles)
6. [Inventario (Activos)](#6-inventario-activos)
7. [Mantenimientos](#7-mantenimientos)
8. [Seguros y Pólizas](#8-seguros-y-pólizas)
9. [Facturación](#9-facturación)
10. [Presupuesto](#10-presupuesto)
11. [Proyectos](#11-proyectos)
12. [Usuarios](#12-usuarios)
13. [Perfiles](#13-perfiles)
14. [Auditoría](#14-auditoría)
15. [Preguntas frecuentes](#15-preguntas-frecuentes)

---

## 1. Convenciones de esta guía

- **Barra lateral izquierda:** menú principal con los módulos. Lo que ves ahí depende de los permisos de tu perfil (ver tabla "Menú visible por perfil" en [DATOS_PRUEBA.md](DATOS_PRUEBA.md#menú-visible-por-perfil-sr-0062)).
- **Barra superior (header):** buscador global, selector de edificio activo, campana de notificaciones y menú de usuario (cerrar sesión).
- **Selector de edificio activo:** la mayoría de módulos trabaja contra **un** edificio a la vez. Cámbialo desde el botón con el ícono de edificio arriba a la derecha. Si no ves datos, verifica primero qué edificio tienes seleccionado.
- **Botones con íconos:**
  - ✏️ Lápiz → editar
  - 🔄 Flechas circulares → cambiar estado
  - ➕ Más → crear/registrar un nuevo elemento
  - 💾 Diskette → guardar
  - ✖️ X → cancelar / cerrar formulario
- **Capturas:** cada sección incluye referencias del tipo `![descripción](img/modulo/archivo.png)`. Las imágenes **no están incluidas** en el repositorio; para generarlas basta con tomar un pantallazo del paso descrito y guardarlo en `docs/img/<módulo>/` con el nombre indicado.

> **Nota sobre permisos.** Las acciones que no tengas permitidas no aparecerán en el menú o estarán deshabilitadas en pantalla. Si una API responde `403 FORBIDDEN`, significa que el perfil asignado no incluye ese permiso.

---

## 2. Primer inicio de sesión y recorrido general

### 2.1 Iniciar sesión

1. Abre `http://localhost:3000` en el navegador.
2. Ingresa correo y contraseña (por ejemplo `admin@example.com` / `Admin123!` para el administrador general).
3. Pulsa **Iniciar sesión**.

![Pantalla de login](img/auth/login.png)

**Qué puede fallar:**

- **Credenciales inválidas:** correo o contraseña incorrectos.
- **Usuario inactivo:** el usuario existe pero fue marcado como inactivo. Pide al administrador que lo reactive.
- **Sin edificios asignados:** podrás entrar, pero no verás datos en los módulos operativos hasta que un administrador te asigne al menos un edificio.

### 2.2 Elementos de la interfaz tras iniciar sesión

- **Barra lateral (izquierda):** navegación entre módulos.
  - Puedes contraerla con el botón **Contraer menú** al final.
- **Barra superior:**
  - **Buscador global** (texto libre).
  - **Selector de edificio activo** — cámbialo haciendo clic en el nombre del edificio.
  - **Campana de notificaciones**.
  - **Avatar + nombre** — haz clic en el avatar para **cerrar sesión**.
- **Área central:** contenido del módulo activo.

![Layout general](img/general/layout.png)

### 2.3 Cambiar edificio activo

1. Clic en el nombre del edificio (barra superior).
2. Se despliega la lista de edificios asignados a tu usuario.
3. Selecciona el que necesites. El edificio seleccionado queda guardado en el navegador (sobrevive a recargas).

### 2.4 Cerrar sesión

Haz clic en tu avatar/nombre a la derecha de la barra superior. Se cierra la sesión y vuelves al login.

---

## 3. Panel General

Vista inicial tras iniciar sesión. Muestra un resumen del edificio activo.

**Qué encuentras aquí:**

- Tarjetas métricas: cantidad de activos, inmuebles, estado general.
- Gráficas (barras y pastel) con la distribución del inventario.
- Alertas o indicadores destacados.

**Cómo usarlo:**

1. Verifica arriba a la derecha que tengas seleccionado el edificio correcto.
2. Revisa las tarjetas superiores para un vistazo rápido del estado.
3. Si no ves datos, el edificio puede no tener activos/inmuebles cargados aún; registra algunos desde los módulos Inventario e Inmuebles.

![Panel general](img/home/panel.png)

---

## 4. Edificios

Permite registrar y mantener los edificios (copropiedades) sobre los que opera el sistema.

Menú lateral → **Edificios**.

### 4.1 Consultar edificios

- Al entrar, verás la tabla con los edificios asignados a tu usuario.
- Columnas típicas: nombre, NIT, dirección, teléfono, correo, fecha de registro.
- Clic sobre una fila para ver el detalle.

![Lista de edificios](img/edificios/lista.png)

### 4.2 Registrar un edificio nuevo

> Requiere permiso `buildings.create` (incluido en Administrador general y Administrador de edificio).

1. Pulsa **Registrar edificio**.
2. Captura los campos obligatorios:
   - **Nombre**
   - **NIT** (debe ser único en el sistema)
   - **Dirección**
   - **Teléfono**
   - **Correo**
3. Pulsa **Guardar**.
4. El edificio aparece en la lista y queda disponible para asignación a otros usuarios.

![Formulario registrar edificio](img/edificios/registrar.png)

**Validaciones:**

- Si ya existe un edificio con el mismo NIT, el sistema rechaza el registro.
- Correos y teléfonos tienen validación de formato.

### 4.3 Editar un edificio

1. Clic sobre un edificio en la lista.
2. Pulsa **Editar**.
3. Modifica los campos permitidos y guarda.

Toda modificación queda registrada en el módulo [Auditoría](#14-auditoría) con usuario y fecha.

---

## 5. Inmuebles

Gestión de unidades (apartamentos, locales, parqueaderos) de un edificio y de sus responsables.

Menú lateral → **Inmuebles**.

### 5.1 Elegir edificio

Antes de operar en este módulo, selecciona el edificio en el **selector superior**. Los inmuebles están siempre asociados a un edificio.

### 5.2 Registrar un inmueble

1. Pulsa **Registrar inmueble**.
2. Captura:
   - **Número** (único dentro del edificio).
   - **Torre/Bloque**.
   - **Coeficiente de copropiedad**.
   - **Estado**.
   - **Tipo** (apartamento, local, parqueadero, etc.).
3. Guarda.

![Formulario inmueble](img/inmuebles/registrar.png)

**Validación clave:** no puede haber dos inmuebles con el mismo número dentro del mismo edificio.

### 5.3 Registrar responsable del inmueble

Desde el detalle del inmueble → **Registrar responsable**:

1. Captura **identificación**, **nombre**, **teléfono** y **correo**.
2. Opcional: asócialo a varias unidades del mismo edificio.
3. Guarda.

Los responsables no tienen credenciales de acceso al sistema; son datos de contacto únicamente.

![Responsable del inmueble](img/inmuebles/responsable.png)

---

## 6. Inventario (Activos)

Permite llevar el inventario de activos físicos del edificio (bombas, ascensores, equipos de seguridad, etc.), sus proveedores y costos.

Menú lateral → **Inventario**.

### 6.1 Vista principal

Tabla con los activos del edificio activo. Columnas: código, nombre, tipo, estado, ubicación.

![Inventario](img/inventario/lista.png)

### 6.2 Registrar un activo nuevo

1. Pulsa **Registrar activo**.
2. Captura:
   - **Código** interno
   - **Nombre**
   - **Descripción**
   - **Tipo:** electromecánico, eléctrico, hidráulico, seguridad, accesos, emergencias, otro.
   - **Estado:** activo, en mantenimiento, fuera de servicio, retirado.
   - **Ubicación**
   - **Fecha de adquisición**
3. Guarda.

### 6.3 Editar un activo

Clic sobre el activo → botón **Editar** (lápiz) → modifica campos permitidos → **Guardar**.

### 6.4 Cambiar estado de un activo

En el detalle del activo → botón **Cambiar estado** (🔄):

1. Elige el nuevo estado.
2. Captura el **motivo** (obligatorio).
3. Guarda.

El cambio queda registrado en el historial del activo.

![Cambiar estado](img/inventario/cambiar-estado.png)

### 6.5 Historial del activo

Panel **Historial del activo**: lista cronológica de cambios (información y estado) con usuario y fecha. Útil para rastrear cuándo entró o salió de servicio.

### 6.6 Proveedor del activo

En el detalle, sección **Proveedor del activo**:

- **Origen → Seleccionar existente:** eliges un proveedor del catálogo.
- **Origen → Registrar nuevo:** capturas identificación, nombre, teléfono, correo y rol (**suministro** o **soporte**). El proveedor queda disponible para otros activos.

### 6.7 Costos de un activo

Dos tipos:

- **Costo de adquisición** (único por activo): valor, fecha y documento opcional.
- **Costos de operación** (varios): reparación, mejora, mantenimiento.

En el detalle:

1. Sección **Costo de adquisición** → captura valor, fecha, documento → **Guardar**.
2. Sección **Costos del activo** → formulario inferior para registrar costos de operación.
3. **Resumen:** total, operación, adquisición.
4. **Filtros:** por tipo (adquisición, reparación, mejora, mantenimiento) y por rango de fechas (**Desde / Hasta**).

![Costos activo](img/inventario/costos.png)

**Validación:** valores negativos son rechazados.

---

## 7. Mantenimientos

Programación y seguimiento de mantenimientos preventivos y correctivos, incluyendo proveedores, costos y alertas.

Menú lateral → **Mantenimientos**.

### 7.1 Registrar un mantenimiento

1. Pulsa **Registrar mantenimiento** (+).
2. Captura:
   - **Activo** afectado (del inventario del edificio activo).
   - **Tipo:** preventivo o correctivo.
   - **Fecha programada**.
   - **Frecuencia** (si aplica): única, semanal, quincenal, mensual, trimestral, semestral, anual.
   - **Descripción**.
3. Guarda.

![Registrar mantenimiento](img/mantenimientos/registrar.png)

### 7.2 Cambiar estado de un mantenimiento

Estados disponibles: **programado**, **en ejecución**, **finalizado**, **cancelado**.

1. Abre el mantenimiento.
2. Botón **Cambiar estado**.
3. Elige el nuevo estado y guarda.

El historial queda disponible en la ficha del mantenimiento.

### 7.3 Asignar proveedor

En el detalle del mantenimiento → **Asignar proveedor**:

- Elige uno del catálogo o crea uno nuevo (identificación, nombre, teléfono, correo).

### 7.4 Registrar costos del mantenimiento

En el detalle → **Costos**:

1. Captura mano de obra, repuestos u otros costos.
2. Guarda. Quedan asociados al mantenimiento y suman al costo acumulado del activo.

### 7.5 Alertas de mantenimiento

Botón **🔔 Alertas** del encabezado:

- Configura con qué **anticipación** (en días) quieres recibir alertas de mantenimientos próximos.
- Marca alertas como **atendidas** cuando ya hayas actuado sobre ellas.

![Alertas mantenimiento](img/mantenimientos/alertas.png)

---

## 8. Seguros y Pólizas

Gestión de pólizas de seguros del edificio, cotizaciones y siniestros.

Menú lateral → **Seguros y Pólizas**.

El módulo tiene tres pestañas:

1. **Pólizas Registradas**
2. **Cotizaciones**
3. **Seguimiento Siniestralidad**

### 8.1 Pólizas registradas

Lista de pólizas vigentes del edificio activo. Para cada una verás aseguradora, cobertura, vigencia y prima.

**Registrar una póliza:** botón **Nueva póliza** → captura:

- Aseguradora
- Tipo de cobertura
- Prima
- Vigencia desde / hasta
- Documento de referencia

### 8.2 Cotizaciones

Permite registrar y comparar cotizaciones antes de contratar una póliza.

1. Pulsa **+ Nueva cotización**.
2. Captura aseguradora, cobertura, prima, vigencia y documento.
3. Guarda. La cotización aparece en la tabla.

![Cotización de seguros](img/seguros/cotizacion.png)

### 8.3 Seguimiento de siniestralidad (Claims)

Registro de siniestros contra una póliza.

**Reportar siniestro:**

1. Pulsa **Reportar siniestro**.
2. Captura:
   - **Póliza** afectada.
   - **Fecha** del siniestro.
   - **Descripción**.
   - **Estado:** reportada, en revisión, aprobada, rechazada, indemnizada.
   - **Monto reclamado** / **monto indemnizado** (cuando aplique).
   - **Activos afectados** (del inventario).
   - **Documentos** adjuntos.
3. Guarda.

**Filtrar:** por póliza o por activo para encontrar siniestros específicos.

![Siniestros](img/seguros/siniestros.png)

---

## 9. Facturación

Cartera, facturación por unidad, aplicación de pagos, intereses de mora y recibos de caja.

Menú lateral → **Facturación**.

Pestañas principales (según permisos):

- **Cartera** — estado por unidad.
- **Historial de facturas** — filtros por unidad, periodo y estado.
- **Pagos** — registrar y aplicar pagos.
- **Configuración de intereses de mora** (solo con permiso `billing.charge.create`).

### 9.1 Consultar cartera

1. Selecciona el edificio activo.
2. Pestaña **Cartera**: tabla por unidad con saldo, estado (al día / pendiente / en mora / parcialmente pagada / pagada).
3. Filtros disponibles: unidad, periodo (mes), estado.

![Cartera](img/facturacion/cartera.png)

### 9.2 Ver detalle de una factura

Clic sobre una factura en el historial → se abre un panel con los componentes (capital, intereses, descuentos) y los pagos aplicados.

### 9.3 Registrar un pago

1. Pestaña **Pagos** → botón **Registrar pago**.
2. Captura:
   - **Unidad** que paga.
   - **Fecha de pago**.
   - **Monto**.
   - **Método:** transferencia, efectivo, etc.
   - **Referencia** (opcional, para transferencias/consignaciones).
   - **Aplicar automáticamente:** marcado → el sistema aplica el pago a las facturas pendientes más antiguas. Si lo desmarcas, podrás distribuir manualmente.
3. Guarda. El pago aparece como **registrado** y, si se aplicó, también como **aplicado**.

![Registrar pago](img/facturacion/pago.png)

### 9.4 Aplicar un pago manualmente

Si registraste un pago sin aplicar automáticamente, luego puedes:

1. Abrir el pago.
2. Elegir qué factura(s) saldar.
3. Confirmar.

### 9.5 Configurar intereses de mora

> Requiere permiso `billing.charge.create`.

1. Pestaña **Intereses**.
2. Ajusta la **tasa anual** (en porcentaje).
3. Guarda. La tasa se usará para calcular los intereses de facturas vencidas desde ese momento.

![Intereses](img/facturacion/intereses.png)

---

## 10. Presupuesto

Elaboración, aprobación y seguimiento del presupuesto anual del edificio.

Menú lateral → **Presupuesto**.

El módulo tiene varias secciones apiladas:

1. **Presupuesto histórico** — vista de ejecución de años anteriores.
2. **Presupuesto anual** — planeación del año en curso.
3. **Ejecución** — registro de gastos y comparación contra lo proyectado.
4. **Comparación** — proyectado vs. ejecutado por rubro.
5. **Reporte** — exportable para asamblea.

### 10.1 Elegir metodología

Al inicio puedes elegir entre **Base 0**, **Mixta** o **Histórica**. Esto afecta solo cómo se presentan y proyectan los rubros; no cambia los datos registrados.

### 10.2 Registrar presupuesto anual

> Requiere permiso `budget.update`.

1. Sección **Presupuesto anual**.
2. Pulsa **Agregar rubro** o edita los existentes.
3. Captura rubro, monto proyectado, categoría.
4. Guarda.

![Presupuesto anual](img/presupuesto/anual.png)

### 10.3 Registrar ejecución

1. Sección **Ejecución**.
2. Botón **Registrar ejecución**.
3. Captura rubro, monto ejecutado, fecha, descripción.
4. Guarda. La barra de ejecución del rubro se actualiza.

### 10.4 Ver comparación y reporte

- **Comparación:** gráfica de barras **Proyectado vs. Ejecutado** por rubro.
- **Reporte:** tabla final con porcentaje de ejecución y disponible.

![Comparación presupuesto](img/presupuesto/comparacion.png)

---

## 11. Proyectos

Gestión de proyectos de obra, mejora o mantenimiento mayor, con cotizaciones, avances y cierre.

Menú lateral → **Proyectos**.

### 11.1 Registrar un proyecto

1. Pulsa **Nuevo proyecto**.
2. Captura:
   - **Nombre**
   - **Objetivo**
   - **Tipo:** obra, mejora, mantenimiento, otro.
   - **Presupuesto estimado**
   - **Fecha inicio / fin**
   - **Responsable**
   - **Referencia de aprobación** (acta, resolución, etc.)
3. Guarda. El proyecto queda en estado **Aprobado**.

![Nuevo proyecto](img/proyectos/nuevo.png)

### 11.2 Registrar cotizaciones y seleccionar proveedor

1. Abre el proyecto.
2. Sección **Cotizaciones** → **Agregar cotización**.
3. Elige **proveedor existente** o **registra uno nuevo** (identificación, nombre).
4. Captura monto, vigencia, alcance.
5. Guarda. Repite para comparar.
6. Marca una cotización como **Seleccionada** → el proveedor queda vinculado al proyecto.

### 11.3 Registrar avances

1. Sección **Avances** → **Registrar avance**.
2. Captura **porcentaje ejecutado**, **monto gastado**, **fecha**, **ejecutor** (si aplica) y una **descripción**.
3. Guarda. El estado del proyecto cambia a **En ejecución** con el primer avance.

![Avance de proyecto](img/proyectos/avance.png)

### 11.4 Cerrar un proyecto

Cuando el avance llega al 100% (o cuando se decida cerrar):

1. Botón **Cerrar proyecto**.
2. Confirma. Estado pasa a **Finalizado** (o **Cancelado** si así se decide).
3. El proyecto queda bloqueado para nuevos cambios, visible solo en consulta.

---

## 12. Usuarios

Gestión de los usuarios administrativos del sistema y sus asignaciones.

Menú lateral → **Usuarios**.

> Visible para administradores y, en modo solo-lectura, para administradores de edificio y auditores.

### 12.1 Consultar usuarios

Tabla con identificación, nombre, correo, estado y perfiles asignados.

![Lista de usuarios](img/usuarios/lista.png)

### 12.2 Registrar usuario

1. Pulsa **Registrar usuario**.
2. Captura:
   - **Identificación**
   - **Nombre**
   - **Correo** (único)
   - **Contraseña**
   - **Estado** (activo/inactivo)
3. Guarda. El usuario aparece en la lista pero aún no tiene perfiles ni edificios asignados.

### 12.3 Asignar perfiles

1. Clic sobre el usuario → sección **Perfiles**.
2. Marca uno o varios perfiles de la lista disponible.
3. Guarda. El menú lateral de ese usuario se ajustará en su próxima sesión.

### 12.4 Asignar edificios

1. En la ficha del usuario → sección **Edificios asignados**.
2. Marca los edificios que podrá ver/gestionar.
3. Guarda.

![Asignar edificios](img/usuarios/asignar-edificios.png)

**Importante:** un usuario solo verá datos (unidades, activos, facturas, etc.) de los edificios asignados, incluso si tiene permisos de administración. El filtro se aplica tanto en la UI como en la API.

### 12.5 Activar / desactivar un usuario

Edita el usuario y cambia el campo **Estado**. Un usuario inactivo no puede iniciar sesión; recibe un rechazo con `403 INACTIVE_USER`.

---

## 13. Perfiles

Definición de los perfiles (roles) y los permisos que incluyen.

Menú lateral → **Perfiles**.

### 13.1 Consultar perfiles

Tabla con nombre, descripción y cantidad de permisos.

### 13.2 Crear perfil

1. Pulsa **Crear perfil**.
2. Captura **nombre** y **descripción**.
3. Marca los **permisos** permitidos (por módulo).
4. Guarda.

![Crear perfil](img/perfiles/crear.png)

### 13.3 Editar permisos de un perfil

1. Clic sobre el perfil.
2. Marca/desmarca permisos.
3. Guarda. Los usuarios que tengan ese perfil verán el cambio aplicado al reconectar.

> **Permisos clave que vale la pena conocer:**
>
> - `admin.all` — supra-permiso del administrador general.
> - `*.list`, `*.read`, `*.create`, `*.update` — operaciones CRUD por módulo.
> - `audit.read` — acceso al módulo de Auditoría.
> - `billing.charge.create` — habilita configurar intereses de mora en Facturación.
> - `budget.update` — habilita editar el presupuesto.

---

## 14. Auditoría

Registro cronológico de todas las operaciones que modifican datos: quién, cuándo, qué y sobre qué entidad.

Menú lateral → **Auditoría**.

> Visible para perfiles con `audit.read` (Administrador general y Auditor).

### 14.1 Consultar registros

Tabla con columnas típicas:

- **Fecha / hora**
- **Usuario**
- **Operación** (create, update, delete, status_change, etc.)
- **Entidad** (building, unit, asset, user, invoice, project, etc.)
- **Edificio** (si aplica)
- **Detalle** (campos modificados o payload)

![Lista de auditoría](img/auditoria/lista.png)

### 14.2 Filtrar

Filtros disponibles:

- **Usuario**
- **Edificio**
- **Entidad / módulo**
- **Rango de fechas**

Combínalos para investigar un caso específico (por ejemplo: "todos los cambios de estado de activos del Edificio Nogal en el último mes").

### 14.3 Qué puedes verificar aquí

- Quién creó, editó o eliminó un edificio, usuario, inmueble, activo, factura, póliza o proyecto.
- Cuándo cambió el estado de un activo o de un mantenimiento.
- Reconstruir una secuencia de eventos para un reclamo o inconsistencia.

> **Tip:** la auditoría es solo-lectura. No se puede modificar ni borrar un registro desde la aplicación. Es la fuente de verdad para rastrear acciones.

---

## 15. Preguntas frecuentes

**No veo el módulo X en el menú.** Tu perfil no tiene el permiso correspondiente, o no tienes edificios asignados. Revisa [DATOS_PRUEBA.md](DATOS_PRUEBA.md#menú-visible-por-perfil-sr-0062) para ver qué menú corresponde a cada perfil.

**El selector de edificio está vacío.** Tu usuario no tiene edificios asignados. Pide al administrador que te asigne al menos uno desde el módulo [Usuarios](#12-usuarios).

**Registré algo y no aparece.** Verifica el edificio activo arriba a la derecha. Muchos módulos filtran por edificio; es muy común haberlo registrado en uno y estar viendo otro.

**Un botón de acción está deshabilitado.** Te falta el permiso específico (por ejemplo, `budget.update` o `billing.charge.create`). Revisa tu perfil con un administrador.

**Olvidé mi contraseña.** Pídele a un administrador general que la restablezca editando tu usuario desde el módulo [Usuarios](#12-usuarios).

**¿Qué hago si veo datos incorrectos de otro usuario?** Repórtalo. En paralelo, el módulo [Auditoría](#14-auditoría) permite ver quién y cuándo modificó los datos.

---

## Dónde seguir

- [GUIA_DEMOSTRACION.md](GUIA_DEMOSTRACION.md) — recorrido guiado por cada historia de usuario, útil para presentaciones.
- [DATOS_PRUEBA.md](DATOS_PRUEBA.md) — credenciales de prueba y matriz de permisos por perfil.
- [ARCHITECTURE.md](ARCHITECTURE.md) — cómo está construido el sistema por dentro.
