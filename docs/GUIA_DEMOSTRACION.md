# Guía de demostración de historias de usuario

Recorrido paso a paso para mostrar cada historia implementada del sistema. Cada sección indica **qué HU se demuestra**, dónde hacerlo en la aplicación y qué datos capturar. El orden respeta las dependencias funcionales (primero autenticarse, luego administrar catálogos, luego operar).

> **Precondiciones**
>
> - MySQL levantado (`docker compose up -d`).
> - Migraciones y seeds aplicados (`npm run db:migrate && npm run db:seed`).
> - API y web en ejecución (`npm run dev`).
> - Credenciales de prueba tomadas de `docs/DATOS_PRUEBA.md`.

---

## 1. Acceso al sistema

### 1.1 Iniciar sesión — **HU-008**

1. Abrir `http://localhost:3000`.
2. Ingresar `admin@example.com` / `Admin123!`.
3. Confirmar redirección al panel principal y menú lateral visible.

**Qué se demuestra**

- Validación de credenciales y estado activo (SR-008.1).
- Creación de sesión segura y opción de cierre desde el menú superior (SR-008.2).

**Caso negativo:** intentar login con `inactivo@example.com` / `Inactivo123!` y mostrar el rechazo por usuario inactivo.

---

## 2. Administración de edificios

### 2.1 Registrar edificio — **HU-001**

Menú lateral → **Edificios** → botón **Registrar edificio**.

1. Capturar nombre, NIT, dirección, teléfono y correo (SR-001.1).
2. Guardar y verificar que aparece en la lista.
3. Intentar registrar otro edificio con el mismo NIT para mostrar la validación de duplicados (SR-001.2).

### 2.2 Consultar edificios — **HU-002**

En la misma pantalla:

1. Mostrar la tabla con edificios asignados al usuario autenticado (SR-002.1).
2. Hacer clic sobre un edificio para abrir su detalle (SR-002.2).
3. Cambiar a la sesión de `operador@example.com` para evidenciar que solo ve el edificio asignado.

### 2.3 Actualizar edificio — **HU-003**

1. Abrir un edificio y usar **Editar**.
2. Modificar la dirección o el teléfono y guardar.
3. Mostrar que se conserva la fecha de actualización y el usuario responsable (auditoría — se verá en la sección 6).

---

## 3. Perfiles, usuarios y accesos

### 3.1 Crear perfil de usuario — **HU-004**

Menú lateral → **Perfiles** → **Crear perfil**.

1. Registrar nombre y descripción (SR-004.1).
2. Seleccionar los permisos permitidos (SR-004.2).
3. Guardar y verificar que aparece en la lista.

### 3.2 Registrar usuario administrativo — **HU-005**

Menú lateral → **Usuarios** → **Registrar usuario**.

1. Capturar identificación, nombre, correo, contraseña y estado (SR-005.1).
2. Guardar. Repetir con el mismo correo para mostrar la validación de unicidad (SR-005.2).

### 3.3 Asignar roles y permisos — **HU-006**

En la ficha del usuario recién creado:

1. Marcar uno o varios perfiles (SR-006.1).
2. Guardar y cerrar sesión.
3. Iniciar sesión con ese usuario y mostrar cómo el menú lateral se ajusta a los permisos (SR-006.2) — el mapa de menú por perfil está en `docs/DATOS_PRUEBA.md`.

### 3.4 Asignar edificios al usuario — **HU-007**

En la misma ficha:

1. Seleccionar los edificios permitidos (SR-007.1).
2. Iniciar sesión con ese usuario y verificar que solo ve/gestiona los edificios asignados (SR-007.2).

---

## 4. Inmuebles y responsables

Menú lateral → **Inmuebles**. Elegir un edificio en el selector.

### 4.1 Registrar apartamento o unidad — **HU-010**

1. Botón **Registrar inmueble**.
2. Capturar número, torre/bloque, coeficiente y estado (SR-010.1).
3. Guardar. Repetir con el mismo número para evidenciar la validación de unicidad dentro del edificio (SR-010.2).

### 4.2 Registrar responsable del apartamento — **HU-011**

En el detalle del inmueble → **Registrar responsable**.

1. Capturar identificación, nombre, teléfono y correo (SR-011.1).
2. Asociarlo a una o varias unidades (SR-011.2).
3. Confirmar que el responsable no genera credenciales de acceso.

---

## 5. Inventario y activos

Menú lateral → **Inventario**. Elegir el edificio de trabajo.

### 5.1 Registrar activo — **HU-012**

Botón **Registrar activo**:

1. Capturar código, nombre, descripción, tipo, estado, ubicación y fecha de adquisición (SR-012.1).
2. Guardar y confirmar que el activo queda asociado al edificio (SR-012.2).

### 5.2 Consultar activos — **HU-013**

1. Mostrar la tabla con activos del edificio (SR-013.1).
2. Señalar las columnas: código, nombre, tipo, estado y ubicación (SR-013.2).

### 5.3 Actualizar activo — **HU-014**

Abrir un activo → botón **Editar (lápiz)**.

1. Modificar campos permitidos (SR-014.1).
2. Guardar y evidenciar que la modificación se registra con usuario y fecha (SR-014.2).

### 5.4 Cambiar estado del activo — **HU-015**

En el detalle → botón **Cambiar estado (flechas)**.

1. Elegir un nuevo estado (activo, en mantenimiento, fuera de servicio, retirado) (SR-015.1).
2. Escribir el motivo y guardar (SR-015.2).

### 5.5 Consultar historial del activo — **HU-016**

En el detalle, panel **Historial del activo**:

1. Confirmar que aparecen los cambios de información y estado (SR-016.1).
2. Recorrer los registros en orden cronológico con usuario y fecha (SR-016.2).

### 5.6 Consultar detalle del activo — **HU-017** *(parcial)*

Panel **Detalle del activo**:

1. Mostrar la información técnica y económica del activo (SR-017.1).
2. Señalar el proveedor asociado y el costo de adquisición (SR-017.2).
3. **Nota:** las relaciones con mantenimientos y pólizas están pendientes hasta que se implementen los módulos correspondientes.

### 5.7 Registrar proveedor del activo — **HU-018**

En el detalle → sección **Proveedor del activo**:

**Opción A — proveedor nuevo (SR-018.1)**

1. Cambiar el **Origen** a **Registrar nuevo**.
2. Capturar identificación, nombre, teléfono, correo y rol (suministro/soporte) (SR-018.2).
3. Guardar. El proveedor queda disponible en el catálogo para otros activos.

**Opción B — proveedor existente (SR-018.1)**

1. Volver a la sección de proveedor y elegir **Origen: Seleccionar existente**.
2. Escoger un proveedor del catálogo y guardar.

### 5.8 Registrar costo de adquisición — **HU-019**

En el detalle → sección **Costo de adquisición**:

1. Ingresar valor, fecha y documento de compra opcional (SR-019.1).
2. Intentar guardar un valor negativo para demostrar la validación (SR-019.2).
3. Guardar con un valor válido; el costo aparece en el resumen y en la tabla de costos.

### 5.9 Consultar costos del activo — **HU-020**

En el detalle → sección **Costos del activo**:

1. Registrar uno o dos costos de operación (reparación, mejora, mantenimiento) con el formulario inferior.
2. Ver el resumen con **Total**, **Operación** y **Adquisición** (SR-020.1).
3. Aplicar filtros por **Tipo** y por **Desde/Hasta** para acotar el detalle por intervención y periodo (SR-020.2).

---

## 6. Auditoría

Menú lateral → **Auditoría** (con `admin@example.com` o `auditor@example.com`).

### 6.1 Consultar auditoría — **HU-009**

1. Mostrar la tabla con usuario, fecha, operación, entidad y edificio (SR-009.1).
2. Aplicar filtros por usuario, fecha, módulo y edificio (SR-009.2).
3. Recorrer las entradas creadas durante la demostración (edificios, usuarios, activos, proveedores, costos, etc.) para evidenciar la trazabilidad.

---

## 7. Verificación por API (opcional)

Todos los flujos anteriores están respaldados por endpoints REST. Ejemplos rápidos con `curl` (usando la cookie de sesión de `admin@example.com` guardada en `cookies.txt`):

```powershell
# HU-013 — listar activos del edificio 1
curl.exe -b cookies.txt http://localhost:5000/api/v1/assets/buildings/1/assets

# HU-018 — catálogo de proveedores
curl.exe -b cookies.txt http://localhost:5000/api/v1/assets/suppliers

# HU-020 — resumen de costos del activo 5, filtrado por 2025
curl.exe -b cookies.txt "http://localhost:5000/api/v1/assets/5/costs/summary?from=2025-01-01&to=2025-12-31"
```

---

## 8. Cobertura demostrada

| HU  | Título                               | Cubierta en |
| --- | ------------------------------------ | ----------- |
| HU-001 | Registrar edificio                | 2.1 |
| HU-002 | Consultar edificios (parcial)     | 2.2 |
| HU-003 | Actualizar edificio               | 2.3 |
| HU-004 | Crear perfiles de usuario         | 3.1 |
| HU-005 | Registrar usuario administrativo  | 3.2 |
| HU-006 | Asignar roles y permisos          | 3.3 |
| HU-007 | Asignar edificios al usuario      | 3.4 |
| HU-008 | Iniciar sesión                    | 1.1 |
| HU-009 | Consultar auditoría               | 6.1 |
| HU-010 | Registrar apartamento             | 4.1 |
| HU-011 | Registrar responsable             | 4.2 |
| HU-012 | Registrar activo                  | 5.1 |
| HU-013 | Consultar activos                 | 5.2 |
| HU-014 | Actualizar activo                 | 5.3 |
| HU-015 | Cambiar estado del activo         | 5.4 |
| HU-016 | Consultar historial del activo    | 5.5 |
| HU-017 | Consultar detalle (parcial)       | 5.6 |
| HU-018 | Registrar proveedor del activo    | 5.7 |
| HU-019 | Registrar costo de adquisición    | 5.8 |
| HU-020 | Consultar costos del activo       | 5.9 |


