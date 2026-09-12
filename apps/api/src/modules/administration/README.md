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
