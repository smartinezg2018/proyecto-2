Historias de usuario

# Módulo: Administración y acceso

### HU-001 – Registrar edificio

Como administrador general, quiero registrar un edificio, para gestionar su información de manera independiente.

#### Criterios de aceptación

- El sistema permite capturar el nombre, la identificación, la dirección y los datos de contacto del edificio.
- El sistema valida los campos obligatorios antes de guardar la información.
- El sistema rechaza el registro cuando ya existe un edificio con la misma identificación.
- El sistema registra la fecha de creación y el usuario que realizó el registro.


### HU-002 – Consultar edificios

Como administrador general, quiero consultar los edificios registrados, para acceder a la información de cada copropiedad.

#### Criterios de aceptación

- El sistema muestra únicamente el listado de edificios asignados al usuario autenticado.
- El listado presenta como mínimo el nombre, la identificación, la dirección y el estado del edificio.
- El sistema permite abrir el detalle de un edificio seleccionado.
- El sistema impide consultar edificios que no estén asignados al usuario.


### HU-003 – Actualizar información de un edificio

Como administrador general, quiero actualizar la información de un edificio, para mantener sus datos vigentes.

#### Criterios de aceptación

- El sistema permite modificar únicamente los datos autorizados del edificio.
- El sistema valida los campos obligatorios y la unicidad de la identificación antes de guardar los cambios.
- El sistema registra la fecha de actualización y el usuario que realizó la modificación.
- El sistema conserva la trazabilidad de la modificación para efectos de auditoría.

# Módulo: Inventario-Activos

### HU-004 – Registrar activo

Como administrador del edificio, quiero registrar un activo, para llevar el control de los bienes pertenecientes al edificio.


### HU-005 – Consultar activos

Como administrador, quiero visualizar el listado de activos registrados, para conocer los recursos disponibles del edificio.


### HU-006 – Actualizar información de un activo

Como administrador, quiero modificar la información de un activo, para mantener sus datos actualizados.


### HU-007 – Cambiar el estado de un activo

Como administrador, quiero tener trazabilidad de las actualizaciones o modernizaciones del activo, para conocer la vida útil de el mismo. 


### HU-008 – Consultar detalle de un activo

Como administrador, quiero visualizar la información detallada de un activo, para conocer sus características(proveedor, costo inicial de adquisición, quien hace los mantenimientos) y su estado actual.


# Módulo: Mantenimientos

### HU-009 – Registrar mantenimiento

Como administrador, quiero registrar un mantenimiento asociado a un activo, para llevar el historial de intervenciones realizadas.


### HU-010 – Programar mantenimiento

Como administrador, quiero programar mantenimientos preventivos, para evitar fallas en los activos del edificio.


### HU-011 – Actualizar estado del mantenimiento

Como administrador, quiero conocer el costo real de los mantenimientos realizados a los equipos, para hacer el cruce con los recursos asignados


### HU-012 – Consultar historial de mantenimientos

Como administrador, quiero consultar el historial de mantenimientos de un activo, para conocer las intervenciones realizadas anteriormente.


# Módulo: Seguros

### HU-013 – Registrar póliza

Como administrador, quiero registrar la póliza de seguro que cubre los riesgos de un activo, para mantener protegidos los bienes del edificio.


### HU-014 – Actualizar información de una póliza

Como administrador, quiero actualizar la información de una póliza, para mantener los datos vigentes.


### HU-015 – Consultar seguros

Como administrador, quiero consultar todas las pólizas registradas, para verificar la cobertura de los activos.


### HU-016 – Consultar pólizas próximas a vencer

Como administrador, quiero identificar las pólizas próximas a vencer, para gestionar su renovación oportunamente.


### HU-017 – Seguimiento siniestralidad

Como administrador, quiero tener un registro detallado de las reclamaciones realizadas a las compañías aseguradoras, para garantizar que se han recibido las indemnizaciones de acuerdo con las condiciones negociadas.


# Módulo: Facturación-recaudo

### HU-018 – Generar factura

Como administrador, quiero generar una factura de administración a un apartamento, para realizar el cobro correspondiente de las cuotas aprobadas en asambleas (ordinaria o extraordinaria).


### HU-019 – Registrar pago

Como administrador, quiero registrar el pago de una factura, para actualizar el estado de la cartera.


### HU-020 – Consultar estado de cartera

Como administrador, quiero visualizar el estado de cartera de los apartamentos, para identificar pagos pendientes.


### HU-021 – Consultar historial de facturación

Como administrador, quiero consultar el historial de facturas emitidas, para realizar seguimiento a los cobros realizados.


### HU-022 – Recibo de caja

Como administrador, quiero identificar y aplicar los pagos recibidos de los apartamentos, para cruzar las facturas generadas mensualmente


### HU-023 – Intereses de mora

Como administrador, quiero poder calcular interés de mora a la tasa máxima permitida, para cobrarle a los apartamentos que no han pagado oportunamente sus cuotas. 


# Módulo: Presupuesto

### HU-024 – Crear presupuesto anual

Como administrador, quiero calcular el presupuesto anual del edificio, para planificar los gastos del periodo (base 0, mixta o histórica).


### HU-025 – Registrar ejecución presupuestal

Como administrador, quiero registrar los gastos ejecutados, para comparar el presupuesto con la ejecución real.


# Módulo: Proyectos


### HU-026 – Registrar proyecto

Como administrador, quiero controlar el proyecto aprobado por la asamblea general, para garantizar una ejecución adecuada de recursos.


### HU-027 – Cotizaciones

Como administrador, quiero tener comparativos de diferentes propuestas de proyecto, para seleccionar la que mejor cumpla las expectativas del edificio.


### HU-028 – Actualizar avance del proyecto

Como administrador, quiero registrar el avance de un proyecto, para realizar seguimiento a su ejecución.


### HU-029 – Consultar proyectos

Como administrador, quiero consultar los proyectos ejecutados del pasado, para compararlos con los proyectos que se van a desarrollar.


### HU-030 – Finalizar proyecto

Como administrador, quiero cerrar un proyecto cuando haya concluido, para dejar registro de su finalización y de los resultados obtenidos.

