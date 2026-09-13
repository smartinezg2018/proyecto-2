# Datos de prueba y credenciales por defecto

Este documento describe los usuarios, perfiles y edificios semilla disponibles para probar las funcionalidades implementadas en entorno local.

> **Solo para desarrollo.** No uses estas contraseñas en producción.

## Cómo cargar los datos

1. Levanta MySQL:

```bash
docker compose up -d
```

2. Aplica migraciones:

```bash
npm.cmd run db:migrate
```

3. Carga los datos semilla:

```bash
npm.cmd run db:seed
```

4. Inicia la aplicación:

```bash
npm.cmd run dev
```

5. Abre `http://localhost:3000` e inicia sesión con cualquiera de los usuarios de la tabla siguiente.

El script de seeds es idempotente: puedes ejecutarlo varias veces y actualizará contraseñas, perfiles y asignaciones de edificios sin duplicar registros.

## Usuarios de prueba

| Usuario | Correo | Contraseña | Perfil | Propósito |
| --- | --- | --- | --- | --- |
| Ana Martínez | `admin@example.com` | `Admin123!` | Administrador general | Probar todas las funcionalidades: usuarios, perfiles, asignaciones y auditoría |
| Carlos Ruiz | `edificio@example.com` | `Edificio123!` | Administrador de edificio | Probar acceso limitado a edificios asignados |
| Laura Gómez | `auditor@example.com` | `Auditor123!` | Auditor | Probar consulta de auditoría sin permisos de administración |
| Pedro Sánchez | `operador@example.com` | `Operador123!` | Operador | Probar acceso mínimo de consulta a un solo edificio |
| Usuario Inactivo | `inactivo@example.com` | `Inactivo123!` | Operador | Probar rechazo de login por usuario inactivo |

## Edificios semilla

| NIT | Nombre | Dirección |
| --- | --- | --- |
| `900111001` | Conjunto El Nogal | Calle 10 # 20-30, Bogotá |
| `900111002` | Torre Central | Av. 68 # 45-12, Bogotá |
| `900111003` | Residencia Los Robles | Carrera 7 # 80-15, Bogotá |

## Asignación de edificios por usuario

| Usuario | Edificios asignados |
| --- | --- |
| `admin@example.com` | El Nogal, Torre Central, Los Robles |
| `edificio@example.com` | El Nogal, Torre Central |
| `auditor@example.com` | Ninguno |
| `operador@example.com` | El Nogal |
| `inactivo@example.com` | El Nogal |

## Perfiles y permisos

| Perfil | Permisos |
| --- | --- |
| Administrador general | `admin.all` |
| Administrador de edificio | edificios (CRUD), inmuebles, responsables, activos, listados de usuarios/perfiles y módulos operativos (`maintenance.view`, `insurance.view`, `billing.view`, `budget.view`, `projects.view`) |
| Auditor | `audit.read`, `users.list`, `profiles.list`, `buildings.list`, `buildings.read` |
| Operador | `buildings.list`, `buildings.read`, `units.list`, `assets.list`, `maintenance.view` |

## Menú visible por perfil (SR-006.2)

| Sección | Admin | Admin edificio | Auditor | Operador |
| --- | --- | --- | --- | --- |
| Panel General | sí | sí | sí | sí |
| Edificios | sí | sí | sí | sí |
| Inmuebles | sí | sí | no | sí |
| Inventario | sí | sí | no | sí |
| Mantenimientos | sí | sí | no | sí |
| Seguros / Facturación / Presupuesto / Proyectos | sí | sí | no | no |
| Usuarios | sí | sí (solo listar) | sí (solo listar) | no |
| Perfiles | sí | sí (solo listar) | sí (solo listar) | no |
| Auditoría | sí | no | sí | no |

Las APIs también validan el mismo permiso: sin él responden `403 FORBIDDEN`.

## Qué probar con cada usuario

### `admin@example.com`

- Iniciar sesión y acceder a todas las secciones del menú.
- **Usuarios:** registrar usuarios y asignar perfiles/edificios.
- **Perfiles:** crear perfiles con permisos.
- **Edificios:** crear, listar y actualizar edificios.
- **Auditoría:** consultar operaciones con filtros por usuario, edificio, módulo y fechas.

### `edificio@example.com`

- Ver menú operativo (edificios, inmuebles, activos, módulos) sin Auditoría.
- Listar usuarios y perfiles, sin formularios de creación/asignación.
- Verificar que asignar perfiles/edificios o consultar auditoría responde `403 FORBIDDEN`.

### `auditor@example.com`

- Ver **Auditoría**, Usuarios y Perfiles (consulta).
- Verificar que **no** aparecen Inventario, Mantenimientos ni módulos financieros.

### `operador@example.com`

- Ver Panel, Edificios, Inmuebles, Inventario y Mantenimientos.
- Verificar que **no** aparecen Usuarios, Perfiles ni Auditoría.

### `inactivo@example.com`

- Intentar iniciar sesión y confirmar mensaje de usuario inactivo (`403 INACTIVE_USER`).

## Endpoints útiles para pruebas manuales

| Operación | Método | Ruta |
| --- | --- | --- |
| Login | `POST` | `/api/v1/auth/login` |
| Usuario actual | `GET` | `/api/v1/auth/me` |
| Listar usuarios | `GET` | `/api/v1/administration/users` |
| Asignar perfiles | `PUT` | `/api/v1/administration/users/:userId/profiles` |
| Asignar edificios | `PUT` | `/api/v1/administration/users/:userId/buildings` |
| Consultar auditoría | `GET` | `/api/v1/administration/audit-logs` |

Ejemplo de login con curl (PowerShell):

```powershell
curl.exe -X POST http://localhost:5000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"admin@example.com\",\"password\":\"Admin123!\"}" `
  -c cookies.txt
```

## Notas

- Las contraseñas se almacenan con hash `scrypt`; el script de seeds las regenera en cada ejecución.
- Si cambias permisos en migraciones, vuelve a ejecutar `npm.cmd run db:migrate` y luego `npm.cmd run db:seed`.
- MySQL local usa las credenciales definidas en `.env` (`DB_USER=app`, `DB_PASSWORD=app_password`).
- El seed registra auditoría de creación de edificios (y hace backfill si ya existían sin log).
- La pantalla Auditoría muestra nombre de usuario y de edificio; filtra por entidad `building`, `unit`, `asset`, etc.
