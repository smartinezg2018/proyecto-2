# Sistema de gestión administrativa de edificios

Sistema web para centralizar la administración de activos, mantenimientos, seguros, facturación, recaudo, presupuesto y proyectos de una copropiedad.

## Cómo correr el proyecto

### Requisitos

- Node.js 20+
- Docker (para MySQL)

### Pasos

1. Clona el repositorio y entra a la carpeta del proyecto.

2. Crea el archivo de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

En Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

3. Instala las dependencias (raíz, API y web):

```bash
npm install
npm run install:all
```

4. Levanta MySQL:

```bash
docker compose up -d
```

5. Aplica migraciones y carga datos de prueba:

```bash
npm run db:migrate
npm run db:seed
```

6. Inicia API y frontend en modo desarrollo:

```bash
npm run dev
```

7. Abre la aplicación en [http://localhost:3000](http://localhost:3000).

La API queda en `http://localhost:5000`. Credenciales y perfiles de prueba están en [docs/DATOS_PRUEBA.md](docs/DATOS_PRUEBA.md).

## Documentación

- [Arquitectura del sistema](docs/ARCHITECTURE.md)
- [Datos de prueba y credenciales por defecto](docs/DATOS_PRUEBA.md)
- [Guía de estilo y calidad de código](GUIA_ESTILO.md)
- [Historias de usuario](Historias%20de%20usuario.md)
- [Backlog provisional](Backlog_provisional.md)
- [Contexto e instrucciones del proyecto](instructions.md)

## Stack previsto

- Frontend: React.js.
- Backend: Node.js + Express.
- Base de datos: MySQL.
- Persistencia: `mysql2` con consultas parametrizadas y transacciones.

La solución se implementará como un monolito modular con una API REST versionada. La arquitectura, las reglas de dependencia y el orden recomendado de implementación están documentados en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
