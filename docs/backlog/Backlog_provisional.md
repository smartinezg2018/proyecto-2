# Backlog para GitHub Issues y GitHub Projects

## Estructura que se utilizará

El backlog se debe registrar mediante la siguiente jerarquía de GitHub Issues:

1. Cada `EP-XX` será una **Issue de tipo épica**.
2. Cada `HU-XXX` será una **sub-issue de su épica**.
3. Cada `SR-XXX.X` será una **sub-issue de su historia de usuario**.

La estructura resultante será:

```text
EP-XX - Épica
└── HU-XXX - Historia de usuario
    ├── SR-XXX.1 - Subrequisito
    └── SR-XXX.2 - Subrequisito
```

GitHub permite hasta 100 sub-issues por elemento padre y hasta ocho niveles de profundidad. Este backlog utiliza solamente tres niveles.

## Etiquetas recomendadas

Antes de registrar las Issues, cree las siguientes etiquetas en el repositorio:

| Etiqueta                | Uso                                      | Color sugerido |
| ----------------------- | ---------------------------------------- | -------------- |
| `type:epic`             | Identificar las épicas                   | `6f42c1`       |
| `type:story`            | Identificar historias de usuario         | `0075ca`       |
| `type:subrequirement`   | Identificar subrequisitos                | `1d76db`       |
| `priority:high`         | Requerimientos de prioridad alta         | `b60205`       |
| `priority:medium`       | Requerimientos de prioridad media        | `fbca04`       |
| `status:pending`        | Elementos que todavía no se han iniciado | `d4c5f9`       |
| `module:administration` | Administración y acceso                  | `5319e7`       |
| `module:assets`         | Activos                                  | `0e8a16`       |
| `module:maintenance`    | Mantenimientos                           | `006b75`       |
| `module:insurance`      | Seguros                                  | `0366d6`       |
| `module:billing`        | Facturación y recaudo                    | `d93f0b`       |
| `module:budget`         | Presupuesto                              | `c2e0c6`       |
| `module:projects`       | Proyectos                                | `7057ff`       |

## Campos recomendados en GitHub Projects

Configure una vista de tabla con los siguientes campos:

| Campo              | Tipo                                                     |
| ------------------ | -------------------------------------------------------- |
| Title              | Campo predeterminado                                     |
| Status             | Selección: Backlog, Ready, In progress, In review y Done |
| Parent issue       | Campo predeterminado de sub-issues                       |
| Sub-issue progress | Campo predeterminado de progreso                         |
| Priority           | Selección: High, Medium y Low                            |
| Story points       | Número                                                   |
| Iteration          | Iteración o sprint                                       |
| Assignees          | Campo predeterminado                                     |

## Orden de carga en GitHub

1. Cree primero las siete Issues `EP-01` a `EP-07`.
2. Cree cada `HU-XXX` como sub-issue de la épica indicada en la columna **Padre**.
3. Cree cada `SR-XXX.X` como sub-issue de la historia indicada en la columna **Padre**.
4. Agregue todas las Issues al GitHub Project.
5. Active los campos **Parent issue** y **Sub-issue progress** en la vista del proyecto.
6. Asigne los puntos de historia únicamente a las `HU-XXX`.

También puede crear las relaciones desde GitHub CLI:

```bash
gh issue create --title "HU-XXX - Título" --body "Descripción" --parent NUMERO_ISSUE_PADRE
```

**Estado inicial:** Pendiente.

**Nota:** Las prioridades y estimaciones deben ser confirmadas por el equipo durante el refinamiento.

## EP-01 - Administración y acceso

Gestionar edificios, apartamentos, terceros, usuarios, perfiles, permisos y auditoría.

| Tipo             | ID           | Padre  | Título o descripción                                                                                                                                                                       | Prioridad |  SP | Trazabilidad          |
| ---------------- | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------: | --: | --------------------- |
| Requerimiento    | **HU-001**   | EP-01  | **Registrar edificio.** Como administrador general, quiero registrar un edificio, para gestionar su información de manera independiente.                                                   |      Alta |   5 | Decisión del cliente  |
| Subrequerimiento | **SR-001.1** | HU-001 | Capturar nombre, identificación, dirección y datos de contacto del edificio.                                                                                                               |         - |   - | Decisión del cliente  |
| Subrequerimiento | **SR-001.2** | HU-001 | Validar los campos obligatorios y evitar registros duplicados.                                                                                                                             |         - |   - | Decisión del cliente  |
| Requerimiento    | **HU-002**   | EP-01  | **Consultar edificios.** Como administrador general, quiero consultar los edificios registrados, para acceder a la información de cada copropiedad.                                        |      Alta |   3 | Decisión del cliente  |
| Subrequerimiento | **SR-002.1** | HU-002 | Mostrar el listado de edificios asignados al usuario.                                                                                                                                      |         - |   - | Decisión del cliente  |
| Subrequerimiento | **SR-002.2** | HU-002 | Permitir abrir el detalle de un edificio seleccionado.                                                                                                                                     |         - |   - | Decisión del cliente  |
| Requerimiento    | **HU-003**   | EP-01  | **Actualizar edificio.** Como administrador general, quiero actualizar la información de un edificio, para mantener sus datos vigentes.                                                    |      Alta |   3 | Decisión del cliente  |
| Subrequerimiento | **SR-003.1** | HU-003 | Permitir modificar los datos autorizados del edificio.                                                                                                                                     |         - |   - | Decisión del cliente  |
| Subrequerimiento | **SR-003.2** | HU-003 | Registrar la fecha y el usuario que realizó la modificación.                                                                                                                               |         - |   - | Decisión del cliente  |
| Requerimiento    | **HU-004**   | EP-01  | **Crear perfiles de usuario.** Como administrador general, quiero crear perfiles de usuario, para definir diferentes niveles de acceso.                                                    |      Alta |   5 | RF-051                |
| Subrequerimiento | **SR-004.1** | HU-004 | Registrar nombre y descripción del perfil.                                                                                                                                                 |         - |   - | RF-051                |
| Subrequerimiento | **SR-004.2** | HU-004 | Seleccionar las funcionalidades permitidas para el perfil.                                                                                                                                 |         - |   - | RF-051                |
| Requerimiento    | **HU-005**   | EP-01  | **Registrar usuario administrativo.** Como administrador general, quiero registrar usuarios administrativos, para permitirles utilizar la plataforma.                                      |      Alta |   5 | Requisito habilitador |
| Subrequerimiento | **SR-005.1** | HU-005 | Capturar identificación, nombre, correo y estado del usuario.                                                                                                                              |         - |   - | Requisito habilitador |
| Subrequerimiento | **SR-005.2** | HU-005 | Validar que el correo o identificador de acceso no esté registrado.                                                                                                                        |         - |   - | Requisito habilitador |
| Requerimiento    | **HU-006**   | EP-01  | **Asignar roles y permisos.** Como administrador general, quiero asignar roles y permisos, para restringir las funcionalidades según las responsabilidades del usuario.                    |      Alta |   8 | RNF-002               |
| Subrequerimiento | **SR-006.1** | HU-006 | Asignar uno o más perfiles autorizados al usuario.                                                                                                                                         |         - |   - | RNF-002               |
| Subrequerimiento | **SR-006.2** | HU-006 | Aplicar los permisos en las pantallas y operaciones del sistema.                                                                                                                           |         - |   - | RNF-002               |
| Requerimiento    | **HU-007**   | EP-01  | **Asignar edificios al usuario.** Como administrador general, quiero asignar uno o varios edificios a un usuario, para limitar su acceso a las copropiedades que administra.               |      Alta |   5 | Decisión del cliente  |
| Subrequerimiento | **SR-007.1** | HU-007 | Seleccionar los edificios que puede administrar cada usuario.                                                                                                                              |         - |   - | Decisión del cliente  |
| Subrequerimiento | **SR-007.2** | HU-007 | Impedir la consulta o modificación de edificios no asignados.                                                                                                                              |         - |   - | Decisión del cliente  |
| Requerimiento    | **HU-008**   | EP-01  | **Iniciar sesión.** Como usuario autorizado, quiero iniciar sesión con mis credenciales, para acceder de forma segura al sistema.                                                          |      Alta |   5 | RNF-001               |
| Subrequerimiento | **SR-008.1** | HU-008 | Validar las credenciales y el estado activo del usuario.                                                                                                                                   |         - |   - | RNF-001               |
| Subrequerimiento | **SR-008.2** | HU-008 | Crear una sesión segura y permitir su cierre.                                                                                                                                              |         - |   - | RNF-001               |
| Requerimiento    | **HU-009**   | EP-01  | **Consultar auditoría.** Como administrador general, quiero consultar las operaciones realizadas por los usuarios, para auditar los cambios efectuados.                                    |     Media |   8 | RNF-009               |
| Subrequerimiento | **SR-009.1** | HU-009 | Registrar usuario, fecha, operación, entidad y edificio involucrado.                                                                                                                       |         - |   - | RNF-009               |
| Subrequerimiento | **SR-009.2** | HU-009 | Permitir filtrar la auditoría por usuario, fecha, módulo y edificio.                                                                                                                       |         - |   - | RNF-009               |
| Requerimiento    | **HU-010**   | EP-01  | **Registrar apartamento o unidad.** Como administrador, quiero registrar los apartamentos o unidades de un edificio, para utilizarlos en facturación y cartera.                            |      Alta |   5 | Requisito habilitador |
| Subrequerimiento | **SR-010.1** | HU-010 | Capturar número, torre o bloque, coeficiente y estado de la unidad.                                                                                                                        |         - |   - | Requisito habilitador |
| Subrequerimiento | **SR-010.2** | HU-010 | Validar que la identificación de la unidad sea única dentro del edificio.                                                                                                                  |         - |   - | Requisito habilitador |
| Requerimiento    | **HU-011**   | EP-01  | **Registrar responsable del apartamento.** Como administrador, quiero registrar al propietario o responsable de cada apartamento sin crearle acceso, para generar sus documentos de cobro. |      Alta |   5 | Decisión del cliente  |
| Subrequerimiento | **SR-011.1** | HU-011 | Capturar identificación, nombre y datos de contacto del responsable.                                                                                                                       |         - |   - | Decisión del cliente  |
| Subrequerimiento | **SR-011.2** | HU-011 | Asociar el responsable a una o varias unidades sin generar credenciales.                                                                                                                   |         - |   - | Decisión del cliente  |

## EP-02 - Activos

Controlar los activos pertenecientes a cada edificio.

| Tipo             | ID           | Padre  | Título o descripción                                                                                                                                                             | Prioridad |  SP | Trazabilidad |
| ---------------- | ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | --: | ------------ |
| Requerimiento    | **HU-012**   | EP-02  | **Registrar activo.** Como administrador, quiero registrar un activo asociado a un edificio, para controlar los bienes de cada copropiedad.                                      |      Alta |   5 | RF-001       |
| Subrequerimiento | **SR-012.1** | HU-012 | Capturar código, nombre, descripción, tipo, estado y fecha de adquisición.                                                                                                       |         - |   - | RF-001       |
| Subrequerimiento | **SR-012.2** | HU-012 | Asociar obligatoriamente el activo con un edificio.                                                                                                                              |         - |   - | RF-001       |
| Requerimiento    | **HU-013**   | EP-02  | **Consultar activos.** Como administrador, quiero consultar los activos de cada edificio, para conocer los bienes disponibles.                                                   |      Alta |   3 | RF-002       |
| Subrequerimiento | **SR-013.1** | HU-013 | Mostrar únicamente los activos del edificio seleccionado.                                                                                                                        |         - |   - | RF-002       |
| Subrequerimiento | **SR-013.2** | HU-013 | Presentar código, nombre, tipo, estado y ubicación.                                                                                                                              |         - |   - | RF-002       |
| Requerimiento    | **HU-014**   | EP-02  | **Actualizar activo.** Como administrador, quiero actualizar la información de un activo, para mantener sus datos vigentes.                                                      |      Alta |   3 | RF-003       |
| Subrequerimiento | **SR-014.1** | HU-014 | Permitir modificar los campos autorizados del activo.                                                                                                                            |         - |   - | RF-003       |
| Subrequerimiento | **SR-014.2** | HU-014 | Registrar el usuario, la fecha y los valores modificados.                                                                                                                        |         - |   - | RF-003       |
| Requerimiento    | **HU-015**   | EP-02  | **Cambiar estado del activo.** Como administrador, quiero cambiar el estado de un activo, para identificar su situación operativa.                                               |      Alta |   3 | RF-004       |
| Subrequerimiento | **SR-015.1** | HU-015 | Manejar estados como activo, en mantenimiento, fuera de servicio y retirado.                                                                                                     |         - |   - | RF-004       |
| Subrequerimiento | **SR-015.2** | HU-015 | Registrar la fecha y el motivo del cambio de estado.                                                                                                                             |         - |   - | RF-004       |
| Requerimiento    | **HU-016**   | EP-02  | **Consultar historial del activo.** Como administrador, quiero consultar el historial de modificaciones de un activo, para conocer los cambios de su vida útil.                  |     Media |   5 | RF-005       |
| Subrequerimiento | **SR-016.1** | HU-016 | Conservar los cambios de información y estado del activo.                                                                                                                        |         - |   - | RF-005       |
| Subrequerimiento | **SR-016.2** | HU-016 | Mostrar el historial en orden cronológico con usuario y fecha.                                                                                                                   |         - |   - | RF-005       |
| Requerimiento    | **HU-017**   | EP-02  | **Consultar detalle del activo.** Como administrador, quiero consultar la información detallada de un activo, para conocer sus características y estado actual.                  |      Alta |   3 | RF-006       |
| Subrequerimiento | **SR-017.1** | HU-017 | Mostrar la información técnica, económica y administrativa del activo.                                                                                                           |         - |   - | RF-006       |
| Subrequerimiento | **SR-017.2** | HU-017 | Mostrar sus relaciones con proveedor, mantenimientos y pólizas.                                                                                                                  |         - |   - | RF-006       |
| Requerimiento    | **HU-018**   | EP-02  | **Registrar proveedor del activo.** Como administrador, quiero registrar el proveedor asociado a un activo, para identificar quién lo suministró o presta soporte.               |     Media |   3 | RF-007       |
| Subrequerimiento | **SR-018.1** | HU-018 | Seleccionar un proveedor existente o registrar uno nuevo.                                                                                                                        |         - |   - | RF-007       |
| Subrequerimiento | **SR-018.2** | HU-018 | Guardar los datos de contacto y la relación con el activo.                                                                                                                       |         - |   - | RF-007       |
| Requerimiento    | **HU-019**   | EP-02  | **Registrar costo de adquisición.** Como administrador, quiero registrar el costo de adquisición de un activo, para conservar su información económica.                          |      Alta |   3 | RF-008       |
| Subrequerimiento | **SR-019.1** | HU-019 | Capturar valor, fecha y documento de compra cuando exista.                                                                                                                       |         - |   - | RF-008       |
| Subrequerimiento | **SR-019.2** | HU-019 | Validar que el valor sea numérico y no negativo.                                                                                                                                 |         - |   - | RF-008       |
| Requerimiento    | **HU-020**   | EP-02  | **Consultar costos del activo.** Como administrador, quiero consultar los costos de reparaciones, mejoras y mantenimientos, para conocer el costo total de operación del activo. |     Media |   5 | RF-009       |
| Subrequerimiento | **SR-020.1** | HU-020 | Consolidar los costos asociados al activo.                                                                                                                                       |         - |   - | RF-009       |
| Subrequerimiento | **SR-020.2** | HU-020 | Permitir consultar el detalle por tipo de intervención y periodo.                                                                                                                |         - |   - | RF-009       |
| Requerimiento    | **HU-021**   | EP-02  | **Clasificar activo.** Como administrador, quiero clasificar los activos por tipo, para organizar el inventario.                                                                 |      Alta |   3 | RF-010       |
| Subrequerimiento | **SR-021.1** | HU-021 | Permitir registrar y administrar tipos de activo.                                                                                                                                |         - |   - | RF-010       |
| Subrequerimiento | **SR-021.2** | HU-021 | Exigir la selección de un tipo al registrar el activo.                                                                                                                           |         - |   - | RF-010       |
| Requerimiento    | **HU-022**   | EP-02  | **Buscar activos.** Como administrador, quiero buscar y filtrar activos, para localizar rápidamente la información requerida.                                                    |     Media |   5 | RF-011       |
| Subrequerimiento | **SR-022.1** | HU-022 | Buscar por código o nombre del activo.                                                                                                                                           |         - |   - | RF-011       |
| Subrequerimiento | **SR-022.2** | HU-022 | Combinar filtros por edificio, tipo y estado.                                                                                                                                    |         - |   - | RF-011       |

## EP-03 - Mantenimientos

Programar y registrar intervenciones preventivas y correctivas.

| Tipo             | ID           | Padre  | Título o descripción                                                                                                                                                          | Prioridad |  SP | Trazabilidad |
| ---------------- | ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | --: | ------------ |
| Requerimiento    | **HU-023**   | EP-03  | **Registrar mantenimiento.** Como administrador, quiero registrar un mantenimiento asociado a un activo, para conservar el historial de intervenciones.                       |      Alta |   5 | RF-012       |
| Subrequerimiento | **SR-023.1** | HU-023 | Capturar tipo, fecha, descripción y activo intervenido.                                                                                                                       |         - |   - | RF-012       |
| Subrequerimiento | **SR-023.2** | HU-023 | Guardar el mantenimiento dentro del historial del activo.                                                                                                                     |         - |   - | RF-012       |
| Requerimiento    | **HU-024**   | EP-03  | **Programar mantenimiento preventivo.** Como administrador, quiero programar mantenimientos preventivos, para reducir el riesgo de fallas.                                    |      Alta |   5 | RF-013       |
| Subrequerimiento | **SR-024.1** | HU-024 | Definir fecha, frecuencia y responsable del mantenimiento.                                                                                                                    |         - |   - | RF-013       |
| Subrequerimiento | **SR-024.2** | HU-024 | Calcular o registrar la próxima fecha de ejecución.                                                                                                                           |         - |   - | RF-013       |
| Requerimiento    | **HU-025**   | EP-03  | **Registrar mantenimiento correctivo.** Como administrador, quiero registrar mantenimientos correctivos, para documentar las reparaciones realizadas.                         |      Alta |   5 | RF-014       |
| Subrequerimiento | **SR-025.1** | HU-025 | Registrar falla, causa, acciones ejecutadas y fecha.                                                                                                                          |         - |   - | RF-014       |
| Subrequerimiento | **SR-025.2** | HU-025 | Relacionar la reparación con el activo afectado.                                                                                                                              |         - |   - | RF-014       |
| Requerimiento    | **HU-026**   | EP-03  | **Registrar costo de mantenimiento.** Como administrador, quiero registrar el costo de cada mantenimiento, para controlar los recursos utilizados.                            |      Alta |   3 | RF-015       |
| Subrequerimiento | **SR-026.1** | HU-026 | Capturar costo estimado y costo real de la intervención.                                                                                                                      |         - |   - | RF-015       |
| Subrequerimiento | **SR-026.2** | HU-026 | Validar los valores y asociarlos al mantenimiento correspondiente.                                                                                                            |         - |   - | RF-015       |
| Requerimiento    | **HU-027**   | EP-03  | **Registrar proveedor del mantenimiento.** Como administrador, quiero registrar el proveedor responsable de un mantenimiento, para identificar quién realizó la intervención. |     Media |   3 | RF-016       |
| Subrequerimiento | **SR-027.1** | HU-027 | Seleccionar o registrar el proveedor encargado.                                                                                                                               |         - |   - | RF-016       |
| Subrequerimiento | **SR-027.2** | HU-027 | Conservar los datos de contacto y documentos relacionados.                                                                                                                    |         - |   - | RF-016       |
| Requerimiento    | **HU-028**   | EP-03  | **Consultar historial de mantenimientos.** Como administrador, quiero consultar el historial de mantenimientos de un activo, para revisar sus intervenciones anteriores.      |      Alta |   5 | RF-017       |
| Subrequerimiento | **SR-028.1** | HU-028 | Listar los mantenimientos en orden cronológico.                                                                                                                               |         - |   - | RF-017       |
| Subrequerimiento | **SR-028.2** | HU-028 | Permitir abrir el detalle, costos, proveedor y evidencias.                                                                                                                    |         - |   - | RF-017       |
| Requerimiento    | **HU-029**   | EP-03  | **Actualizar estado del mantenimiento.** Como administrador, quiero actualizar el estado de un mantenimiento, para controlar su ejecución.                                    |      Alta |   3 | RF-018       |
| Subrequerimiento | **SR-029.1** | HU-029 | Manejar estados programado, en ejecución, finalizado y cancelado.                                                                                                             |         - |   - | RF-018       |
| Subrequerimiento | **SR-029.2** | HU-029 | Registrar fecha y usuario de cada cambio de estado.                                                                                                                           |         - |   - | RF-018       |
| Requerimiento    | **HU-030**   | EP-03  | **Generar alertas de mantenimiento.** Como administrador, quiero recibir alertas de mantenimientos próximos, para ejecutar las actividades a tiempo.                          |      Alta |   5 | RF-019       |
| Subrequerimiento | **SR-030.1** | HU-030 | Configurar la anticipación de la alerta.                                                                                                                                      |         - |   - | RF-019       |
| Subrequerimiento | **SR-030.2** | HU-030 | Evitar alertas duplicadas y marcar las atendidas.                                                                                                                             |         - |   - | RF-019       |
| Requerimiento    | **HU-031**   | EP-03  | **Comparar cotizaciones de mantenimiento.** Como administrador, quiero almacenar y comparar cotizaciones, para seleccionar la propuesta más conveniente.                      |     Media |   8 | RF-020       |
| Subrequerimiento | **SR-031.1** | HU-031 | Registrar proveedor, valor, vigencia y archivo de cada cotización.                                                                                                            |         - |   - | RF-020       |
| Subrequerimiento | **SR-031.2** | HU-031 | Mostrar un comparativo de precio, alcance y condiciones.                                                                                                                      |         - |   - | RF-020       |

## EP-04 - Seguros

Gestionar pólizas, renovaciones y reclamaciones.

| Tipo             | ID           | Padre  | Título o descripción                                                                                                                                           | Prioridad |  SP | Trazabilidad |
| ---------------- | ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | --: | ------------ |
| Requerimiento    | **HU-032**   | EP-04  | **Comparar cotizaciones de seguros.** Como administrador, quiero almacenar cotizaciones antes de renovar una póliza, para evaluar las alternativas.            |     Media |   5 | RF-021       |
| Subrequerimiento | **SR-032.1** | HU-032 | Registrar aseguradora, cobertura, prima, vigencia y documento.                                                                                                 |         - |   - | RF-021       |
| Subrequerimiento | **SR-032.2** | HU-032 | Presentar un comparativo de las cotizaciones registradas.                                                                                                      |         - |   - | RF-021       |
| Requerimiento    | **HU-033**   | EP-04  | **Registrar póliza.** Como administrador, quiero registrar una póliza, para controlar la protección contratada por el edificio.                                |      Alta |   5 | RF-022       |
| Subrequerimiento | **SR-033.1** | HU-033 | Capturar número, aseguradora, fechas, valor y coberturas.                                                                                                      |         - |   - | RF-022       |
| Subrequerimiento | **SR-033.2** | HU-033 | Validar que la fecha final sea posterior a la fecha inicial.                                                                                                   |         - |   - | RF-022       |
| Requerimiento    | **HU-034**   | EP-04  | **Asociar póliza con activos.** Como administrador, quiero asociar una póliza con los activos cubiertos, para identificar el alcance de su cobertura.          |      Alta |   5 | RF-023       |
| Subrequerimiento | **SR-034.1** | HU-034 | Seleccionar uno o varios activos del mismo edificio.                                                                                                           |         - |   - | RF-023       |
| Subrequerimiento | **SR-034.2** | HU-034 | Mostrar la póliza desde el detalle de cada activo cubierto.                                                                                                    |         - |   - | RF-023       |
| Requerimiento    | **HU-035**   | EP-04  | **Actualizar póliza.** Como administrador, quiero actualizar una póliza, para mantener sus condiciones y datos vigentes.                                       |      Alta |   3 | RF-024       |
| Subrequerimiento | **SR-035.1** | HU-035 | Permitir modificar los campos autorizados.                                                                                                                     |         - |   - | RF-024       |
| Subrequerimiento | **SR-035.2** | HU-035 | Registrar los cambios en la auditoría.                                                                                                                         |         - |   - | RF-024       |
| Requerimiento    | **HU-036**   | EP-04  | **Consultar pólizas.** Como administrador, quiero consultar las pólizas por edificio, para verificar coberturas y vigencias.                                   |      Alta |   3 | RF-025       |
| Subrequerimiento | **SR-036.1** | HU-036 | Listar únicamente las pólizas del edificio seleccionado.                                                                                                       |         - |   - | RF-025       |
| Subrequerimiento | **SR-036.2** | HU-036 | Filtrar por aseguradora, estado y fecha de vencimiento.                                                                                                        |         - |   - | RF-025       |
| Requerimiento    | **HU-037**   | EP-04  | **Alertar vencimiento de póliza.** Como administrador, quiero identificar pólizas próximas a vencer, para gestionar su renovación oportunamente.               |      Alta |   5 | RF-026       |
| Subrequerimiento | **SR-037.1** | HU-037 | Configurar los días de anticipación de la alerta.                                                                                                              |         - |   - | RF-026       |
| Subrequerimiento | **SR-037.2** | HU-037 | Distinguir pólizas vigentes, próximas a vencer y vencidas.                                                                                                     |         - |   - | RF-026       |
| Requerimiento    | **HU-038**   | EP-04  | **Registrar reclamación.** Como administrador, quiero registrar una reclamación ante una aseguradora, para hacer seguimiento al siniestro y la indemnización.  |      Alta |   5 | RF-027       |
| Subrequerimiento | **SR-038.1** | HU-038 | Capturar fecha, descripción, estado, valor reclamado y documentos.                                                                                             |         - |   - | RF-027       |
| Subrequerimiento | **SR-038.2** | HU-038 | Relacionar la reclamación con la póliza y los activos afectados.                                                                                               |         - |   - | RF-027       |
| Requerimiento    | **HU-039**   | EP-04  | **Consultar historial de reclamaciones.** Como administrador, quiero consultar el historial de reclamaciones, para conocer siniestros y resultados anteriores. |     Media |   5 | RF-028       |
| Subrequerimiento | **SR-039.1** | HU-039 | Listar reclamaciones por edificio, póliza o activo.                                                                                                            |         - |   - | RF-028       |
| Subrequerimiento | **SR-039.2** | HU-039 | Mostrar resultado, indemnización, fechas y documentos.                                                                                                         |         - |   - | RF-028       |

## EP-05 - Facturación y recaudo

Generar cobros, aplicar pagos y controlar la cartera.

| Tipo             | ID           | Padre  | Título o descripción                                                                                                                                                    | Prioridad |  SP | Trazabilidad          |
| ---------------- | ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | --: | --------------------- |
| Requerimiento    | **HU-040**   | EP-05  | **Generar facturas ordinarias.** Como administrador, quiero generar facturas de administración, para cobrar las cuotas ordinarias de los apartamentos.                  |      Alta |   8 | RF-029                |
| Subrequerimiento | **SR-040.1** | HU-040 | Seleccionar edificio, periodo y apartamentos que se van a facturar.                                                                                                     |         - |   - | RF-029                |
| Subrequerimiento | **SR-040.2** | HU-040 | Calcular conceptos, vencimiento y total de cada factura.                                                                                                                |         - |   - | RF-029                |
| Requerimiento    | **HU-041**   | EP-05  | **Generar cuotas extraordinarias.** Como administrador, quiero generar cobros extraordinarios en una o varias cuotas, para aplicar lo aprobado por la asamblea.         |      Alta |   8 | RF-030                |
| Subrequerimiento | **SR-041.1** | HU-041 | Registrar concepto, valor, número de cuotas y referencia de aprobación.                                                                                                 |         - |   - | RF-030                |
| Subrequerimiento | **SR-041.2** | HU-041 | Distribuir las cuotas en los periodos definidos.                                                                                                                        |         - |   - | RF-030                |
| Requerimiento    | **HU-042**   | EP-05  | **Generar cobros retroactivos.** Como administrador, quiero generar cobros retroactivos en una cuota o de forma diferida, para aplicar los ajustes aprobados.           |      Alta |   8 | RF-031                |
| Subrequerimiento | **SR-042.1** | HU-042 | Registrar periodo de origen, concepto, valor y número de cuotas.                                                                                                        |         - |   - | RF-031                |
| Subrequerimiento | **SR-042.2** | HU-042 | Programar los cobros en las facturas correspondientes.                                                                                                                  |         - |   - | RF-031                |
| Requerimiento    | **HU-043**   | EP-05  | **Registrar pago.** Como administrador, quiero registrar el pago recibido de un apartamento, para actualizar su cartera.                                                |      Alta |   8 | RF-032                |
| Subrequerimiento | **SR-043.1** | HU-043 | Capturar fecha, valor, medio y referencia del pago.                                                                                                                     |         - |   - | RF-032                |
| Subrequerimiento | **SR-043.2** | HU-043 | Validar que el pago quede asociado al edificio y apartamento correctos.                                                                                                 |         - |   - | RF-032                |
| Requerimiento    | **HU-044**   | EP-05  | **Aplicar pago a facturas.** Como administrador, quiero aplicar un pago a las facturas correspondientes, para realizar correctamente el cruce de valores.               |      Alta |   8 | Necesidad del cliente |
| Subrequerimiento | **SR-044.1** | HU-044 | Permitir aplicación automática por antigüedad o aplicación manual.                                                                                                      |         - |   - | Necesidad del cliente |
| Subrequerimiento | **SR-044.2** | HU-044 | Conservar como saldo a favor cualquier valor no aplicado.                                                                                                               |         - |   - | Necesidad del cliente |
| Requerimiento    | **HU-045**   | EP-05  | **Actualizar estado de factura.** Como administrador, quiero que el sistema actualice el estado de una factura después de aplicar un pago, para conocer su situación.   |      Alta |   5 | RF-033                |
| Subrequerimiento | **SR-045.1** | HU-045 | Calcular los estados pendiente, parcialmente pagada y pagada.                                                                                                           |         - |   - | RF-033                |
| Subrequerimiento | **SR-045.2** | HU-045 | Actualizar el saldo después de cada aplicación o reversión.                                                                                                             |         - |   - | RF-033                |
| Requerimiento    | **HU-046**   | EP-05  | **Consultar cartera.** Como administrador, quiero consultar la cartera de cada apartamento, para identificar sus saldos pendientes.                                     |      Alta |   5 | RF-034                |
| Subrequerimiento | **SR-046.1** | HU-046 | Mostrar capital, intereses, pagos y saldo total.                                                                                                                        |         - |   - | RF-034                |
| Subrequerimiento | **SR-046.2** | HU-046 | Filtrar la cartera por edificio, apartamento, periodo y estado.                                                                                                         |         - |   - | RF-034                |
| Requerimiento    | **HU-047**   | EP-05  | **Consultar historial de facturación.** Como administrador, quiero consultar el historial de facturación de un apartamento, para revisar los cobros realizados.         |     Media |   5 | RF-035                |
| Subrequerimiento | **SR-047.1** | HU-047 | Listar facturas por periodo y estado.                                                                                                                                   |         - |   - | RF-035                |
| Subrequerimiento | **SR-047.2** | HU-047 | Permitir abrir el detalle de conceptos, pagos y saldo.                                                                                                                  |         - |   - | RF-035                |
| Requerimiento    | **HU-048**   | EP-05  | **Generar recibo de caja.** Como administrador, quiero generar un recibo de caja por cada pago aplicado, para entregar un comprobante.                                  |      Alta |   3 | RF-036                |
| Subrequerimiento | **SR-048.1** | HU-048 | Asignar un número consecutivo al recibo.                                                                                                                                |         - |   - | RF-036                |
| Subrequerimiento | **SR-048.2** | HU-048 | Incluir datos del pago, apartamento, facturas aplicadas y saldo.                                                                                                        |         - |   - | RF-036                |
| Requerimiento    | **HU-049**   | EP-05  | **Calcular intereses de mora.** Como administrador, quiero calcular automáticamente intereses de mora, para cobrar pagos posteriores al vencimiento.                    |      Alta |   8 | RF-037                |
| Subrequerimiento | **SR-049.1** | HU-049 | Configurar la tasa aplicable y calcular los días de mora.                                                                                                               |         - |   - | RF-037                |
| Subrequerimiento | **SR-049.2** | HU-049 | Recalcular el interés cuando cambie el saldo o la fecha de pago.                                                                                                        |         - |   - | RF-037                |
| Requerimiento    | **HU-050**   | EP-05  | **Evitar capitalización de intereses.** Como administrador, quiero aplicar intereses únicamente sobre el capital vencido, para evitar cobrar intereses sobre intereses. |      Alta |   5 | RF-038                |
| Subrequerimiento | **SR-050.1** | HU-050 | Separar capital, intereses y otros conceptos en la cartera.                                                                                                             |         - |   - | RF-038                |
| Subrequerimiento | **SR-050.2** | HU-050 | Excluir los intereses acumulados de la base del nuevo cálculo.                                                                                                          |         - |   - | RF-038                |
| Requerimiento    | **HU-051**   | EP-05  | **Generar colilla de pago.** Como administrador, quiero generar una colilla de pago, para enviarla al responsable sin que ingrese al sistema.                           |      Alta |   5 | Decisión del cliente  |
| Subrequerimiento | **SR-051.1** | HU-051 | Incluir conceptos, total, vencimiento, apartamento y referencia de pago.                                                                                                |         - |   - | Decisión del cliente  |
| Subrequerimiento | **SR-051.2** | HU-051 | Permitir descargar o generar la colilla en un formato compartible.                                                                                                      |         - |   - | Decisión del cliente  |

## EP-06 - Presupuesto

Elaborar y controlar el presupuesto de cada edificio.

| Tipo             | ID           | Padre  | Título o descripción                                                                                                                                                                      | Prioridad |  SP | Trazabilidad |
| ---------------- | ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | --: | ------------ |
| Requerimiento    | **HU-052**   | EP-06  | **Calcular presupuesto desde ejecución anterior.** Como administrador, quiero calcular el presupuesto usando la ejecución real del año anterior, para elaborar una proyección sustentada. |      Alta |   8 | RF-039       |
| Subrequerimiento | **SR-052.1** | HU-052 | Consultar la ejecución del periodo anterior por partida.                                                                                                                                  |         - |   - | RF-039       |
| Subrequerimiento | **SR-052.2** | HU-052 | Copiar los valores como base editable del nuevo presupuesto.                                                                                                                              |         - |   - | RF-039       |
| Requerimiento    | **HU-053**   | EP-06  | **Aplicar incrementos presupuestales.** Como administrador, quiero aplicar porcentajes de incremento a las partidas, para proyectar sus valores.                                          |      Alta |   5 | RF-040       |
| Subrequerimiento | **SR-053.1** | HU-053 | Definir un porcentaje general o individual por partida.                                                                                                                                   |         - |   - | RF-040       |
| Subrequerimiento | **SR-053.2** | HU-053 | Recalcular y mostrar el valor resultante antes de guardar.                                                                                                                                |         - |   - | RF-040       |
| Requerimiento    | **HU-054**   | EP-06  | **Registrar presupuesto anual.** Como administrador, quiero registrar el presupuesto anual de cada edificio, para planificar ingresos y gastos.                                           |      Alta |   8 | RF-041       |
| Subrequerimiento | **SR-054.1** | HU-054 | Registrar vigencia, partidas, valores y clasificación de ingresos o gastos.                                                                                                               |         - |   - | RF-041       |
| Subrequerimiento | **SR-054.2** | HU-054 | Manejar versiones y estado de elaboración o aprobación.                                                                                                                                   |         - |   - | RF-041       |
| Requerimiento    | **HU-055**   | EP-06  | **Registrar ejecución presupuestal.** Como administrador, quiero registrar la ejecución presupuestal, para controlar los valores realmente ejecutados.                                    |      Alta |   5 | RF-042       |
| Subrequerimiento | **SR-055.1** | HU-055 | Asociar cada movimiento ejecutado con una partida.                                                                                                                                        |         - |   - | RF-042       |
| Subrequerimiento | **SR-055.2** | HU-055 | Actualizar el valor ejecutado y el saldo disponible.                                                                                                                                      |         - |   - | RF-042       |
| Requerimiento    | **HU-056**   | EP-06  | **Comparar presupuesto y ejecución.** Como administrador, quiero comparar el presupuesto aprobado con la ejecución real, para identificar desviaciones.                                   |      Alta |   8 | RF-043       |
| Subrequerimiento | **SR-056.1** | HU-056 | Calcular variación en valor y porcentaje por partida.                                                                                                                                     |         - |   - | RF-043       |
| Subrequerimiento | **SR-056.2** | HU-056 | Resaltar partidas con sobreejecución o baja ejecución.                                                                                                                                    |         - |   - | RF-043       |
| Requerimiento    | **HU-057**   | EP-06  | **Generar reporte presupuestal.** Como administrador, quiero generar reportes de ejecución, para presentar el estado del presupuesto.                                                     |     Media |   5 | RF-044       |
| Subrequerimiento | **SR-057.1** | HU-057 | Filtrar el reporte por edificio, vigencia, periodo y partida.                                                                                                                             |         - |   - | RF-044       |
| Subrequerimiento | **SR-057.2** | HU-057 | Permitir descargar o imprimir el reporte.                                                                                                                                                 |         - |   - | RF-044       |

## EP-07 - Proyectos

Registrar, ejecutar y cerrar proyectos aprobados.

| Tipo             | ID           | Padre  | Título o descripción                                                                                                                                     | Prioridad |  SP | Trazabilidad |
| ---------------- | ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | --: | ------------ |
| Requerimiento    | **HU-058**   | EP-07  | **Registrar proyecto.** Como administrador, quiero registrar un proyecto aprobado, para controlar su alcance, recursos y ejecución.                      |      Alta |   5 | RF-045       |
| Subrequerimiento | **SR-058.1** | HU-058 | Capturar edificio, objetivo, presupuesto, fechas y responsable.                                                                                          |         - |   - | RF-045       |
| Subrequerimiento | **SR-058.2** | HU-058 | Manejar el estado inicial y la referencia de aprobación.                                                                                                 |         - |   - | RF-045       |
| Requerimiento    | **HU-059**   | EP-07  | **Registrar cotizaciones del proyecto.** Como administrador, quiero registrar múltiples cotizaciones, para conservar las propuestas recibidas.           |      Alta |   5 | RF-046       |
| Subrequerimiento | **SR-059.1** | HU-059 | Capturar proveedor, valor, vigencia, alcance y documento.                                                                                                |         - |   - | RF-046       |
| Subrequerimiento | **SR-059.2** | HU-059 | Relacionar todas las cotizaciones con el proyecto.                                                                                                       |         - |   - | RF-046       |
| Requerimiento    | **HU-060**   | EP-07  | **Comparar cotizaciones del proyecto.** Como administrador, quiero comparar las cotizaciones, para seleccionar la alternativa más conveniente.           |      Alta |   8 | RF-047       |
| Subrequerimiento | **SR-060.1** | HU-060 | Mostrar una matriz de precio, alcance, tiempo y condiciones.                                                                                             |         - |   - | RF-047       |
| Subrequerimiento | **SR-060.2** | HU-060 | Registrar la propuesta seleccionada y la justificación.                                                                                                  |         - |   - | RF-047       |
| Requerimiento    | **HU-061**   | EP-07  | **Registrar avance del proyecto.** Como administrador, quiero registrar el avance de un proyecto, para controlar su ejecución física y financiera.       |      Alta |   5 | RF-048       |
| Subrequerimiento | **SR-061.1** | HU-061 | Registrar porcentaje, fecha, costo ejecutado, observaciones y evidencias.                                                                                |         - |   - | RF-048       |
| Subrequerimiento | **SR-061.2** | HU-061 | Conservar el historial de avances sin sobrescribir registros anteriores.                                                                                 |         - |   - | RF-048       |
| Requerimiento    | **HU-062**   | EP-07  | **Consultar historial de proyectos.** Como administrador, quiero consultar proyectos ejecutados, para utilizarlos como referencia en nuevas iniciativas. |     Media |   5 | RF-049       |
| Subrequerimiento | **SR-062.1** | HU-062 | Filtrar por edificio, estado, fecha y tipo de proyecto.                                                                                                  |         - |   - | RF-049       |
| Subrequerimiento | **SR-062.2** | HU-062 | Mostrar el detalle, cotizaciones, avances, costos y cierre.                                                                                              |         - |   - | RF-049       |
| Requerimiento    | **HU-063**   | EP-07  | **Cerrar proyecto.** Como administrador, quiero registrar el cierre de un proyecto, para documentar su finalización, costo y resultados.                 |      Alta |   5 | RF-050       |
| Subrequerimiento | **SR-063.1** | HU-063 | Capturar fecha final, costo total, resultado y documentos de cierre.                                                                                     |         - |   - | RF-050       |
| Subrequerimiento | **SR-063.2** | HU-063 | Cambiar el estado a finalizado y conservar la información para consulta.                                                                                 |         - |   - | RF-050       |

## Resumen

| Elemento                              | Cantidad |
| ------------------------------------- | -------: |
| Épicas                                |        7 |
| Requerimientos o historias de usuario |       63 |
| Subrequerimientos                     |      126 |
| **Total de elementos del backlog**    |  **196** |

## Definición preliminar de terminado

Una historia se considerará terminada cuando:

1. Todos sus subrequerimientos estén completados.
2. Cumpla los criterios de aceptación definidos para el sprint.
3. Haya sido revisada mediante pruebas funcionales.
4. Respete los permisos definidos para cada rol y edificio.
5. Registre las operaciones auditables cuando corresponda.
6. No tenga defectos críticos abiertos.
7. La Product Owner haya validado el resultado.
