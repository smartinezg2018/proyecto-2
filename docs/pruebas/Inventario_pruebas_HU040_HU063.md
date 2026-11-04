# Inventario de pruebas automáticas — HU-040 a HU-063

HU-053 se excluye porque su implementación no está integrada en `main`. Todas las pruebas se ejecutan con `npm.cmd test`; las integraciones y performance crean bases MySQL temporales y las eliminan al finalizar.

## Pruebas unitarias

| Historias     | Cobertura                                                                               |
| ------------- | --------------------------------------------------------------------------------------- |
| HU-040–HU-045 | Facturas ordinarias, cuotas extraordinarias, retroactivos, pagos, aplicación y estados. |
| HU-046–HU-051 | Cartera, historial, recibos, mora, no capitalización y colillas.                        |
| HU-052        | Resumen anterior, copia editable y validaciones del borrador.                           |
| HU-054–HU-057 | Presupuesto anual, ejecución, comparación y reportes.                                   |
| HU-058–HU-063 | Registro, cotizaciones, selección, avances, historial y cierre de proyectos.            |

Casos añadidos para vacíos específicos: `UT-041-02`, `UT-042-02`, `UT-047-01`, `UT-047-02`, `UT-051-02` y `UT-056-02`.

## Pruebas de integración HTTP + MySQL

### Facturación

- HU-040: `IT-040-01`, `IT-040-02`.
- HU-041: `IT-041-01`, `IT-041-02`.
- HU-042: `IT-042-01`, `IT-042-02`.
- HU-043: `IT-043-01`, `IT-043-02`.
- HU-044: `IT-044-01`, `IT-044-02`.
- HU-045: `IT-045-01`, `IT-045-02`.
- HU-046, HU-047, HU-049 y HU-050: casos funcionales existentes en `application.test.js`.
- HU-048: `IT-048-01`, `IT-048-02`.
- HU-051: `IT-051-01`, `IT-051-02`.

### Presupuesto

- HU-052: casos funcionales existentes `CP-052-01` y `CP-052-02`.
- HU-054: `IT-054-01`, `IT-054-02`.
- HU-055: `IT-055-01`, `IT-055-02`.
- HU-056: `IT-056-01`, `IT-056-02`.
- HU-057: `IT-057-01`, `IT-057-02`.

### Proyectos

- HU-058: `IT-058-01`, `IT-058-02`.
- HU-059: `IT-059-01`, `IT-059-02`.
- HU-060: `IT-060-01`, `IT-060-02`.
- HU-061: `IT-061-01`, `IT-061-02`.
- HU-062: `IT-062-01`, `IT-062-02`.
- HU-063: `IT-063-01`, `IT-063-02`.

## Pruebas de performance

- `PF-BILLING-01`: cartera de 1.000 apartamentos, límite de 5 segundos.
- `PF-BUDGET-01`: reporte de 500 partidas y 5.000 ejecuciones, límite de 5 segundos.
- `PF-PROJECTS-01`: historial filtrado de 1.000 proyectos, límite de 5 segundos.

La inserción de datos y una consulta de calentamiento quedan fuera del tiempo medido.

## Ejecución

```powershell
docker compose up -d mysql
npm.cmd run format:check
npm.cmd run lint
npm.cmd test
```
