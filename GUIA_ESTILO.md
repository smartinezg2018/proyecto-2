# Guía de estilo y calidad de código

Esta guía describe cómo usar las herramientas de análisis y formato del proyecto, y qué estándares debe seguir el equipo al escribir código JavaScript/React.

## 1. Herramientas

| Herramienta  | Rol                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| **ESLint**   | Análisis estático: detecta errores, imports sin usar, mal uso de hooks de React y otras malas prácticas. |
| **Prettier** | Formateo automático: unifica comillas, sangría, saltos de línea y punto y coma.                          |

ESLint y Prettier se complementan. Prettier no sustituye a ESLint: uno da formato visual y el otro cuida la calidad del código.

Configuración relevante:

- `eslint.config.mjs` — reglas de ESLint (API y web)
- `.prettierrc.json` — opciones de Prettier
- `.prettierignore` — archivos que Prettier no debe tocar (incluye `.github`)

## 2. Cómo usarlas

Ejecuta los comandos desde la **raíz** del repositorio, después de instalar dependencias:

```bash
npm install
```

### Comandos

| Comando                | Qué hace                                                                    |
| ---------------------- | --------------------------------------------------------------------------- |
| `npm run format`       | Formatea el código con Prettier (reescribe archivos).                       |
| `npm run format:check` | Verifica el formato sin modificar archivos.                                 |
| `npm run lint`         | Analiza `apps/api` y `apps/web` con ESLint.                                 |
| `npm run lint:fix`     | Igual que `lint`, pero aplica correcciones automáticas cuando ESLint puede. |

Flujo recomendado antes de compartir cambios:

```bash
npm run format
npm run lint
```

Si ESLint reporta problemas fáciles de corregir:

```bash
npm run lint:fix
npm run format
```

### Nota en Windows (PowerShell)

Si aparece un error de _Execution Policy_ al usar `npm`, usa una de estas opciones:

```powershell
# Solo para la sesión actual
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# O llama a npm así
npm.cmd run format
npm.cmd run lint
```

## 3. Estándares de nombramiento

| Elemento                          | Convención                        | Ejemplo                     |
| --------------------------------- | --------------------------------- | --------------------------- |
| Variables (`let` / `var`)         | `camelCase`                       | `let userCounter = 0`       |
| Constantes globales / invariantes | `UPPER_SNAKE_CASE`                | `const MAX_RETRIES = 3`     |
| Otras `const`                     | `camelCase`                       | `const totalMora = 0`       |
| Funciones y métodos               | `camelCase` (verbos descriptivos) | `function calculateTotal()` |
| Clases y constructores            | `PascalCase`                      | `class ShoppingCart`        |
| Propiedades de clase              | `camelCase`                       | `this.userName`             |
| Componentes React (archivo)       | `PascalCase.jsx`                  | `BuildingsPage.jsx`         |
| Módulos / utilidades (archivo)    | `camelCase.js` o `kebab-case.js`  | `buildingUseCases.js`       |
| Archivos de clase                 | `PascalCase.js` o `kebab-case.js` | `AppError.js`               |

Estas reglas las aplica ESLint con `project/naming-conventions`, `camelcase`, `new-cap`, `react/jsx-pascal-case` y `check-file`.

- `let Variable = 'hola'` **falla** → usar `camelCase`.
- `const MiComponente = () => ...` **se permite** (PascalCase solo si el valor es función/clase/componente).
- `main.jsx` es excepción al `PascalCase` de archivos JSX.

Más detalle en [docs/guidelines/Guidelines.md](docs/guidelines/Guidelines.md).

## 4. Estándares de formato (Prettier)

Configuración actual en `.prettierrc.json`:

| Opción          | Valor    | Significado                                            |
| --------------- | -------- | ------------------------------------------------------ |
| `singleQuote`   | `true`   | Comillas simples                                       |
| `semi`          | `true`   | Punto y coma al final de sentencias                    |
| `trailingComma` | `none`   | Sin coma final en listas                               |
| `printWidth`    | `100`    | Ancho máximo de línea aproximado                       |
| `arrowParens`   | `always` | Siempre paréntesis en parámetros de flecha: `(x) => x` |

No edites el formato a mano para “arreglar” estilo: corre `npm run format`.

## 5. Qué revisa ESLint

Alcance:

- **API** (`apps/api`): entorno Node, módulos ESM
- **Web** (`apps/web`): entorno navegador, React y JSX

Reglas principales:

- Perfil **recommended** de ESLint
- React y React Hooks (sin exigir `import React` ni PropTypes)
- Imports y variables sin usar (plugin `unused-imports`)
- Parámetros o variables con prefijo `_` se consideran intencionalmente no usadas (útil en Express, p. ej. `_next`)
- **Nombramiento del proyecto** (`project/naming-conventions` en `eslint/project-plugin.mjs`)
- Nombres de archivo (`eslint-plugin-check-file`)
- `eslint-config-prettier` desactiva reglas de ESLint que chocan con Prettier

Errores típicos que debes corregir:

- Variables en `PascalCase` (`let Variable`) → usar `camelCase`
- Clases en `camelCase` (`class shoppingCart`) → usar `PascalCase`
- Imports o variables declaradas y no usadas
- Sintaxis inválida (por ejemplo `const test;` sin valor)
- Violaciones de reglas de hooks (`useEffect`, `useState`, etc.)
- Archivos `.jsx` que no estén en `PascalCase` (salvo `main.jsx`)

## 6. Convenciones del repositorio

- El frontend vive en `apps/web` y el backend en `apps/api`.
- Los módulos de negocio del API siguen capas: `domain`, `application`, `infrastructure`, `presentation`.
- No se formatea la carpeta `.github` con Prettier (está en `.prettierignore`).
- La arquitectura completa está en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 7. Referencias

- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Google JavaScript Style Guide (nombres)](https://google.github.io/styleguide/jsguide.html)
