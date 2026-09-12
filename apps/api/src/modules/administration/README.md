# Administracion y acceso

Modulo para edificios, unidades, usuarios, roles, permisos y auditoria.

## Creación de perfiles

Se mantiene el contrato en inglés de la API existente:

- `GET /api/v1/administration/permissions`: devuelve el catálogo de funcionalidades en `data`, con `id`, `code` y `name`.
- `POST /api/v1/administration/profiles`: crea un perfil y sus asociaciones en una única transacción.

Body de ejemplo (usar los IDs obtenidos del catálogo):

```json
{
  "name": "Administrador de edificio",
  "description": "Perfil encargado de administrar un edificio",
  "permissionIds": [1, 2, 3]
}
```

Respuesta: HTTP `201`, con `{ "data": { "id": 1, "name": "Administrador de edificio", "description": "Perfil encargado de administrar un edificio", "createdBy": null, "updatedBy": null, "createdAt": "...", "updatedAt": "...", "permissionIds": [1, 2, 3] }, "meta": { "requestId": "..." } }`.

El nombre es obligatorio (máximo 150 caracteres). La descripción es opcional y admite hasta 65535 bytes UTF-8. `permissionIds` es opcional, admite una lista vacía y debe contener enteros positivos seguros. Los IDs repetidos se asocian una sola vez. No se exige nombre único.

Los datos inválidos devuelven HTTP `400` con `error.code: VALIDATION_ERROR`. Los permisos inexistentes devuelven HTTP `400` con `error.code: INVALID_PERMISSIONS`. Se reutiliza el middleware de errores; los fallos de base de datos se propagan a él y se revierte la transacción.

La migración `002_profiles.sql` crea `profiles`, `permissions` y `profile_permissions`, con claves foráneas y clave compuesta para impedir asociaciones duplicadas. Incluye cuatro permisos de las operaciones existentes de edificios; los IDs se consultan mediante el catálogo y no se deben asumir. Las migraciones actuales pueden ejecutarse de nuevo sin duplicar estos permisos. El ejecutor procesa las sentencias separadas por `;`; este formato no admite procedimientos ni delimitadores dentro de literales.

Para probar desde la raíz del proyecto:

1. Configurar MySQL mediante las variables `DB_*` existentes (o `apps/api/.env`, que es donde se ejecutan los scripts de la API).
2. Ejecutar `npm run db:migrate`.
3. Ejecutar `npm run dev --prefix apps/api`.
4. Consultar `http://localhost:5000/api/v1/administration/permissions` con GET en Postman y usar sus IDs en el POST de ejemplo.
5. Probar un nombre vacío y un ID que no aparezca en el catálogo: ambos deben devolver `400` sin guardar el perfil.
6. Ejecutar `npm test` para las pruebas con `node:test`. La prueba de persistencia real requiere una base MySQL de pruebas ya creada, distinta de `DB_NAME`, y accesible con las mismas credenciales: en PowerShell, establecer `$env:TEST_DB_NAME = 'building_management_test'` antes de ejecutar `npm test`. Sin esa variable, esta prueba se omite explícitamente. La prueba deja el esquema y catálogo en esa base, y elimina los perfiles que crea.

Esta feature guarda perfiles y sus permisos. El backend todavía no implementa autenticación ni asignación de perfiles a usuarios, por lo que tampoco restringe estos endpoints al administrador general ni aplica los permisos a las rutas existentes.

## Registro de usuarios administrativos

`POST /api/v1/administration/users` registra un usuario administrativo en la tabla común `users`. No existía una entidad de usuarios ni una relación con perfiles. Se conservan `profiles`, `permissions` y `profile_permissions`; no se crea otro sistema de roles ni se asigna automáticamente un perfil. La asignación de uno o más perfiles pertenece a HU-006 en el backlog, y el registro a HU-005. Este endpoint todavía no autentica al administrador ni permite iniciar sesión al usuario registrado.

Body:

```json
{
  "identification": "123456789",
  "name": "Juan Pérez",
  "email": "juan@email.com",
  "status": "active"
}
```

Los cuatro campos son obligatorios. Identificación, nombre y correo deben ser texto no vacío, con límites de 50, 150 y 150 caracteres respectivamente, iguales a los campos equivalentes de edificios. Se recortan espacios exteriores; el correo se guarda en minúsculas. La identificación se conserva como texto, incluidos ceros iniciales. No existía validación de formato de correo en el backend y no se agrega una nueva para esta historia. Al no existir un catálogo de estados de usuario, se establecen `active` e `inactive`; no se asigna un estado predeterminado. No se solicita ni guarda contraseña.

Respuesta HTTP `201` (ID, fechas y requestId varían):

```json
{
  "data": {
    "id": 1,
    "identification": "123456789",
    "name": "Juan Pérez",
    "email": "juan@email.com",
    "status": "active",
    "createdBy": null,
    "updatedBy": null,
    "createdAt": "2026-09-12T12:00:00.000Z",
    "updatedAt": "2026-09-12T12:00:00.000Z"
  },
  "meta": { "requestId": "..." }
}
```

Correo duplicado, HTTP `409`:

```json
{
  "error": {
    "code": "DUPLICATE_USER_EMAIL",
    "message": "Ya existe un usuario con ese correo.",
    "requestId": "..."
  }
}
```

Identificación duplicada, HTTP `409`:

```json
{
  "error": {
    "code": "DUPLICATE_USER_IDENTIFICATION",
    "message": "Ya existe un usuario con esa identificación.",
    "requestId": "..."
  }
}
```

Si ambos campos están duplicados, la comprobación previa informa primero el correo. Los campos inválidos devuelven HTTP `400` con `VALIDATION_ERROR`. Se consulta la existencia antes de guardar; los índices únicos también evitan duplicados concurrentes y el repositorio traduce esas violaciones a `409`. Los demás errores siguen pasando al middleware existente, que devuelve `500` sin detalles internos en el mensaje.

La migración `003_users.sql` agrega únicamente `users`, sus índices únicos y una restricción para estados válidos. No modifica las tablas previas. Se registra en el ejecutor existente y es repetible mediante `CREATE TABLE IF NOT EXISTS`.

### Prueba manual en PowerShell

Desde la raíz, con Docker Desktop iniciado, ejecutar uno a uno:

```powershell
docker compose up -d mysql
docker compose ps
# Esperar a que MySQL esté healthy.
npm.cmd run db:migrate
npm.cmd run dev --prefix apps/api
```

Dejar esa terminal abierta. En otra terminal:

```powershell
$body = @{
  identification = '123456789'
  name = 'Juan Pérez'
  email = 'juan@email.com'
  status = 'active'
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri 'http://localhost:5000/api/v1/administration/users' `
  -Method Post `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) | ConvertTo-Json -Depth 5
```

Repetir la solicitud devuelve `409` por correo duplicado. Cambiar solo el correo y conservar la identificación devuelve `409` por identificación duplicada. Para cada intento reconstruir `$body` con los nuevos valores. Omitir `name` o enviar un estado diferente de `active`/`inactive` devuelve `400`.

`npm.cmd test` ejecuta las pruebas existentes y las nuevas de casos de uso, repositorio y contrato HTTP. La prueba `users.integration.test.js` requiere `TEST_DB_NAME` con una base exclusiva de pruebas, distinta de `DB_NAME`, accesible con las credenciales `DB_*` (igual que la prueba de perfiles). Verifica persistencia real, migración repetible, restricción de estado y registros concurrentes con correo o identificación repetidos. Limpia los usuarios creados y deja el esquema de pruebas. Sin `TEST_DB_NAME` se omite explícitamente.
