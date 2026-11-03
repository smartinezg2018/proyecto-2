# Requirements Document

## Introduction

Esta funcionalidad permite que un usuario autorizado asigne o reasigne un edificio
a un inmueble desde la sección de inmuebles de la aplicación. Hoy, los inmuebles
se crean siempre en el contexto de un edificio a través del endpoint
`/api/v1/administration/buildings/:buildingId/units`, por lo que no existe una vía
para cambiar el edificio al que pertenece un inmueble una vez creado ni para
crear/editar un inmueble seleccionando el edificio desde la sección de inmuebles.

El objetivo es:

- Exponer en la sección de inmuebles un selector de edificio que permita
  asignar un edificio al crear o editar un inmueble.
- Agregar un endpoint de API para asignar/reasignar el edificio de un inmueble
  existente, con validaciones de unicidad y permisos.
- Registrar todo cambio de edificio en el historial de auditoría.

## Glossary

- **Inmueble**: Registro de la tabla `units` que representa una unidad
  (apartamento, parqueadero, etc.) dentro de un edificio.
- **Edificio**: Registro de la tabla `buildings` al que pertenece un inmueble
  mediante la columna `units.building_id`.
- **Seccion_Inmuebles**: Vista del cliente web dedicada a listar, crear y
  editar inmuebles.
- **API_Inmuebles**: Conjunto de endpoints HTTP del backend que exponen las
  operaciones sobre inmuebles.
- **Usuario_Autorizado**: Usuario autenticado que posee los permisos
  `units.create` o `units.update` según la operación y que tiene acceso al
  edificio origen y destino según `ensureBuildingAccess`.
- **Clave_Unica_Inmueble**: Restricción `uq_units_building_number_tower` sobre
  `(building_id, number, tower)` en la tabla `units`.
- **Registro_Auditoria**: Entrada en la tabla `audit_logs` que describe un
  cambio sobre un inmueble.

## Requirements

### Requirement 1: Selector de edificio en la sección de inmuebles

**User Story:** Como usuario autorizado, quiero elegir el edificio al que pertenece un inmueble desde la sección de inmuebles, para no tener que navegar primero al edificio para crear o editar un inmueble.

#### Acceptance Criteria

1. WHEN el Usuario_Autorizado abre el formulario de creación de inmueble en la Seccion_Inmuebles, THE Seccion_Inmuebles SHALL mostrar un campo de selección de edificio que liste únicamente los edificios a los que el Usuario_Autorizado tiene acceso, ordenados alfabéticamente por nombre, mostrando el nombre del edificio como etiqueta visible y permitiendo filtrar por texto cuando la lista contenga más de 10 edificios.
2. WHEN el Usuario_Autorizado abre el formulario de edición de un inmueble en la Seccion_Inmuebles, THE Seccion_Inmuebles SHALL preseleccionar en el campo de edificio el edificio actual del inmueble y mantener dicho campo visible en todo momento.
3. IF el Usuario_Autorizado intenta enviar el formulario de creación o edición de inmueble sin un edificio seleccionado, THEN THE Seccion_Inmuebles SHALL impedir el envío, mantener los datos ya ingresados en el formulario y mostrar un mensaje de error indicando que el edificio es obligatorio.
4. WHERE el Usuario_Autorizado tiene acceso a un único edificio, THE Seccion_Inmuebles SHALL preseleccionar ese edificio en el campo de selección y presentarlo en modo solo lectura, impidiendo su modificación pero manteniéndolo visible con el nombre del edificio.
5. IF el Usuario_Autorizado no tiene acceso a ningún edificio al abrir la Seccion_Inmuebles, THEN THE Seccion_Inmuebles SHALL deshabilitar el botón de creación de inmuebles, impedir la apertura del formulario de creación y mostrar el mensaje "No tiene edificios disponibles para asignar al inmueble.".
6. IF la carga de la lista de edificios disponibles falla, THEN THE Seccion_Inmuebles SHALL deshabilitar el envío del formulario, mostrar un mensaje de error indicando que no se pudo cargar la lista de edificios y ofrecer una acción para reintentar la carga.

### Requirement 2: Endpoint para asignar edificio a un inmueble existente

**User Story:** Como usuario autorizado, quiero reasignar el edificio de un inmueble existente mediante la API, para corregir errores de registro o reflejar cambios administrativos sin tener que recrear el inmueble.

#### Acceptance Criteria

1. THE API_Inmuebles SHALL exponer el endpoint `PUT /api/v1/administration/units/:unitId/building` que acepta un cuerpo JSON con el campo obligatorio `buildingId` de tipo entero positivo mayor o igual a 1.
2. IF el cuerpo de la solicitud no contiene el campo `buildingId`, o `buildingId` no es un entero positivo, THEN THE API_Inmuebles SHALL rechazar la solicitud con estado 400 y un mensaje de error indicando que `buildingId` es requerido y debe ser un entero positivo, sin modificar ningún registro.
3. WHEN el endpoint recibe una solicitud sin token de autenticación válido o con token expirado, THE API_Inmuebles SHALL responder con estado 401 y un mensaje indicando autenticación requerida, sin modificar ningún registro.
4. WHEN el endpoint recibe una solicitud de un usuario autenticado que no posee el permiso `units.update`, THE API_Inmuebles SHALL responder con estado 403 y un mensaje indicando permisos insuficientes, sin modificar ningún registro.
5. WHEN el endpoint recibe una solicitud autenticada con permiso `units.update`, THE API_Inmuebles SHALL verificar mediante la política `ensureBuildingAccess` que el Usuario_Autorizado tenga acceso tanto al edificio origen (actual del inmueble) como al edificio destino (`buildingId` del cuerpo).
6. IF la política `ensureBuildingAccess` determina que el Usuario_Autorizado no tiene acceso al edificio origen o al edificio destino, THEN THE API_Inmuebles SHALL responder con estado 403 y un mensaje indicando acceso denegado al edificio, sin modificar ningún registro.
7. IF el `unitId` de la URL no corresponde a un inmueble existente en la tabla `units`, THEN THE API_Inmuebles SHALL responder con estado 404 y el mensaje "Inmueble no encontrado.", sin modificar ningún registro.
8. IF el `buildingId` del cuerpo no corresponde a un edificio existente en la tabla `buildings`, THEN THE API_Inmuebles SHALL responder con estado 404 y el mensaje "Edificio no encontrado.", sin modificar ningún registro.
9. IF el `buildingId` del cuerpo es igual al `building_id` actual del inmueble identificado por `unitId`, THEN THE API_Inmuebles SHALL responder con estado 200, no ejecutar ninguna operación de escritura sobre la tabla `units`, y devolver el inmueble sin cambios en el campo `data` de la respuesta.
10. WHEN la asignación es válida y el `buildingId` difiere del `building_id` actual, THE API_Inmuebles SHALL actualizar atómicamente la columna `units.building_id` del inmueble al valor recibido y la columna `units.updated_by` con el identificador del Usuario_Autorizado.
11. IF ocurre un error durante la actualización en base de datos, THEN THE API_Inmuebles SHALL revertir la operación dejando el inmueble en su estado previo y responder con estado 500 y un mensaje indicando que ocurrió un error al actualizar el inmueble.
12. WHEN la actualización se completa con éxito, THE API_Inmuebles SHALL responder con estado 200 y el inmueble actualizado (incluyendo el nuevo `building_id` y el `updated_by` registrado) en el campo `data` de la respuesta, dentro de un tiempo máximo de 2 segundos bajo condiciones normales de operación.

### Requirement 3: Validación de unicidad al reasignar edificio

**User Story:** Como usuario autorizado, quiero que el sistema impida reasignar un inmueble a un edificio donde ya existe otro inmueble con el mismo número y torre, para preservar la unicidad de los inmuebles por edificio.

#### Acceptance Criteria

1. IF al reasignar el edificio ya existe otro inmueble con el mismo `number` y `tower` (comparación exacta, sensible a mayúsculas y espacios tras recortar espacios iniciales y finales) en el edificio destino, THEN THE API_Inmuebles SHALL responder con estado 409 en un tiempo máximo de 2 segundos y un cuerpo que incluya el mensaje "Ya existe un inmueble con el mismo número y torre en el edificio destino.".
2. WHEN se detecta el conflicto de la Clave_Unica_Inmueble durante la operación de reasignación, THE API_Inmuebles SHALL dejar `units.building_id` y los demás campos del inmueble sin modificar, revirtiendo cualquier cambio parcial dentro de la misma transacción.
3. IF la validación de unicidad no puede completarse por indisponibilidad de la base de datos o error interno, THEN THE API_Inmuebles SHALL rechazar la reasignación, dejar `units.building_id` sin modificar y responder con un estado de error indicando que la operación no pudo completarse, sin aplicar cambios parciales.
4. WHEN la Seccion_Inmuebles recibe una respuesta 409 proveniente del endpoint de asignación, THE Seccion_Inmuebles SHALL mostrar el mensaje devuelto por la API_Inmuebles junto al campo de edificio en un tiempo máximo de 1 segundo tras recibir la respuesta, mantener el valor previo del campo de edificio seleccionado y habilitar nuevamente los controles del formulario para permitir una nueva corrección.

### Requirement 4: Registro en auditoría de la reasignación

**User Story:** Como administrador, quiero que cada cambio de edificio sobre un inmueble quede registrado, para poder auditar quién lo cambió y cuándo.

#### Acceptance Criteria

1. WHEN la API_Inmuebles reasigna exitosamente el edificio de un inmueble, THE API_Inmuebles SHALL crear un Registro_Auditoria con la acción `unit.building.reassigned`, el identificador del inmueble, el `building_id` anterior, el `building_id` nuevo, el identificador del Usuario_Autorizado y una marca de tiempo en formato ISO 8601 con precisión de milisegundos y zona horaria UTC, dentro de los 2 segundos posteriores a la confirmación de la reasignación.
2. IF la operación de reasignación falla por validación, conflicto o cualquier otro error antes de confirmar la actualización del inmueble, THEN THE API_Inmuebles SHALL omitir la creación del Registro_Auditoria y preservar el estado previo del inmueble sin cambios.
3. THE API_Inmuebles SHALL ejecutar la inserción del Registro_Auditoria y la actualización del inmueble dentro de una misma transacción atómica de base de datos, de modo que si cualquiera de las dos operaciones falla, ambas se reviertan en conjunto.
4. IF la inserción del Registro_Auditoria falla dentro de la transacción, THEN THE API_Inmuebles SHALL revertir la reasignación del inmueble y responder al cliente con un error indicando que la operación no pudo completarse por fallo de auditoría.

### Requirement 5: Creación de inmueble con edificio seleccionado desde la sección de inmuebles

**User Story:** Como usuario autorizado, quiero crear un inmueble desde la sección de inmuebles indicando el edificio, para evitar el flujo actual que exige abrir primero el edificio.

#### Acceptance Criteria

1. WHEN el Usuario_Autorizado envía el formulario de creación de inmueble desde la Seccion_Inmuebles con un edificio seleccionado y todos los campos obligatorios completos (identificador del inmueble de 1 a 50 caracteres, edificio seleccionado), THE Seccion_Inmuebles SHALL enviar la solicitud a `POST /api/v1/administration/buildings/:buildingId/units` usando el identificador del edificio seleccionado como `:buildingId` dentro de los 2 segundos siguientes al envío.
2. IF el Usuario_Autorizado intenta enviar el formulario de creación sin seleccionar un edificio, THEN THE Seccion_Inmuebles SHALL impedir el envío, mantener los datos ya ingresados en el formulario y mostrar el mensaje de error "Debe seleccionar un edificio para el inmueble." junto al selector de edificio.
3. WHEN la API_Inmuebles responde con estado 201 a una creación iniciada desde la Seccion_Inmuebles, THE Seccion_Inmuebles SHALL cerrar el formulario de creación y mostrar el inmueble recién creado en la primera posición visible del listado dentro de los 2 segundos siguientes a la respuesta, sin requerir recarga manual del navegador.
4. IF la API_Inmuebles responde con un estado de error (4xx o 5xx) a una creación iniciada desde la Seccion_Inmuebles, THEN THE Seccion_Inmuebles SHALL mantener el formulario abierto con los datos ingresados y mostrar un mensaje de error indicando que la creación no pudo completarse, incluyendo el motivo devuelto por la API cuando esté disponible.
5. WHILE la solicitud de creación de inmueble está en curso, THE Seccion_Inmuebles SHALL deshabilitar el botón de envío del formulario e indicar visualmente el estado de carga hasta recibir la respuesta de la API_Inmuebles o hasta cumplirse un tiempo máximo de espera de 30 segundos.

### Requirement 6: Control de permisos y acceso

**User Story:** Como responsable de seguridad, quiero que solo los usuarios con los permisos adecuados puedan asignar o reasignar el edificio de un inmueble, para mantener la segregación de funciones.

#### Acceptance Criteria

1. IF el usuario no está autenticado (token ausente, inválido o expirado) al llamar al endpoint de asignación de edificio de un inmueble, THEN THE API_Inmuebles SHALL rechazar la solicitud con estado HTTP 401, devolver un mensaje indicando que se requiere autenticación, no modificar el inmueble y no revelar información sobre la existencia del recurso.
2. IF el usuario autenticado no posee el permiso `units.update` al llamar al endpoint de asignación de edificio, THEN THE API_Inmuebles SHALL rechazar la solicitud con estado HTTP 403, devolver un mensaje indicando que no tiene permisos para asignar el edificio del inmueble, no modificar el inmueble y registrar el intento denegado en el log de auditoría con identificador de usuario, identificador de inmueble y marca de tiempo en formato ISO 8601 UTC.
3. IF el usuario autenticado no tiene acceso al edificio origen del inmueble o al edificio destino indicado en la solicitud, THEN THE API_Inmuebles SHALL rechazar la solicitud con estado HTTP 403, devolver un mensaje indicando que no tiene acceso al edificio solicitado, no modificar el inmueble y registrar el intento denegado en el log de auditoría con identificador de usuario, identificador de inmueble, identificador del edificio origen, identificador del edificio destino y marca de tiempo en formato ISO 8601 UTC.
4. WHERE el usuario autenticado carece del permiso `units.update` o carece de acceso al edificio actual del inmueble, THE Seccion_Inmuebles SHALL ocultar la acción de cambiar edificio en la vista de edición del inmueble, de modo que el control no sea visible ni invocable desde la interfaz.
5. IF un cliente intenta invocar la acción de cambio de edificio desde la interfaz pese a estar oculta (por ejemplo, mediante manipulación directa de la petición), THEN THE API_Inmuebles SHALL aplicar las validaciones de los criterios 1 a 3 y rechazar la solicitud con el estado HTTP y mensaje correspondientes, sin modificar el inmueble.

### Requirement 7: Obligatoriedad del edificio al crear un inmueble

**User Story:** Como responsable de integridad de datos, quiero que todo inmueble esté asociado a un edificio al momento de su creación, para que no existan inmuebles huérfanos en el sistema.

#### Acceptance Criteria

1. THE API_Inmuebles SHALL rechazar la creación de cualquier inmueble que no incluya un `buildingId` válido, exponiendo la creación únicamente a través del endpoint `POST /api/v1/administration/buildings/:buildingId/units` donde el `:buildingId` es parte obligatoria de la ruta.
2. IF se intenta invocar la creación de un inmueble sin un edificio asociado por cualquier vía, incluida la manipulación directa de la solicitud, THEN THE API_Inmuebles SHALL responder con estado 400 y un mensaje indicando que el edificio es obligatorio para crear un inmueble, sin crear el inmueble.
3. IF el `buildingId` proporcionado al crear un inmueble no corresponde a un edificio existente en la tabla `buildings`, THEN THE API_Inmuebles SHALL responder con estado 404 y el mensaje "Edificio no encontrado.", sin crear el inmueble.
4. THE API_Inmuebles SHALL registrar el `buildingId` recibido como valor NOT NULL en la columna `units.building_id` del inmueble recién creado.
5. WHEN la creación de un inmueble se completa exitosamente, THE API_Inmuebles SHALL devolver en el campo `data` de la respuesta el `building_id` asociado al inmueble recién creado.
6. WHERE la Seccion_Inmuebles presenta el formulario de creación de inmueble, THE Seccion_Inmuebles SHALL marcar el campo de edificio como obligatorio con una indicación visual de obligatoriedad (por ejemplo, un asterisco junto a la etiqueta) e impedir el envío del formulario mientras el campo no tenga un edificio seleccionado.
7. IF la operación de creación de inmueble falla por falta de edificio asociado o por edificio inexistente, THEN THE Seccion_Inmuebles SHALL mantener el formulario de creación abierto, preservar los datos ya ingresados y mostrar el mensaje de error devuelto por la API_Inmuebles junto al campo de edificio.
