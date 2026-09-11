# Sistema de gestión administrativa de edificios

Sistema web para centralizar la administración de activos, mantenimientos, seguros, facturación, recaudo, presupuesto y proyectos de una copropiedad.

## Documentación

- [Arquitectura del sistema](docs/ARCHITECTURE.md)
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
