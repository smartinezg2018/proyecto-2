/**
 * Reglas de nombramiento del proyecto (ver GUIA_ESTILO.md).
 *
 * - Variables (let/var): camelCase
 * - Constantes: camelCase o UPPER_SNAKE_CASE; PascalCase solo si es componente/clase/función
 * - Funciones: camelCase o PascalCase (componentes React)
 * - Clases: PascalCase
 * - Métodos y propiedades de clase: camelCase
 */

const CAMEL_CASE = /^_?[a-z][a-zA-Z0-9]*$/;
const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;
const UPPER_SNAKE_CASE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

function isComponentOrClassInitializer(node) {
  if (!node) {
    return false;
  }

  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ClassExpression'
  ) {
    return true;
  }

  // React.memo / forwardRef / memo(...)
  if (node.type === 'CallExpression') {
    return true;
  }

  return false;
}

function matchesAny(name, patterns) {
  return patterns.some((regex) => regex.test(name));
}

const namingConventionsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce project naming conventions from GUIA_ESTILO.md'
    },
    schema: [],
    messages: {
      badName: "'{{name}}' no cumple el estándar de nombramiento. Se espera: {{expected}}."
    }
  },
  create(context) {
    function report(node, name, expected) {
      context.report({
        node,
        messageId: 'badName',
        data: { name, expected }
      });
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') {
          return;
        }

        const name = node.id.name;
        const kind = node.parent?.type === 'VariableDeclaration' ? node.parent.kind : 'const';

        if (kind === 'let' || kind === 'var') {
          if (!matchesAny(name, [CAMEL_CASE])) {
            report(node.id, name, 'camelCase (ej. userCounter)');
          }
          return;
        }

        // const: camelCase, UPPER_SNAKE_CASE, o PascalCase si es componente/clase
        if (matchesAny(name, [CAMEL_CASE, UPPER_SNAKE_CASE])) {
          return;
        }

        if (PASCAL_CASE.test(name) && isComponentOrClassInitializer(node.init)) {
          return;
        }

        report(
          node.id,
          name,
          'camelCase o UPPER_SNAKE_CASE (PascalCase solo para componentes/clases)'
        );
      },

      FunctionDeclaration(node) {
        if (!node.id) {
          return;
        }

        const name = node.id.name;
        if (!matchesAny(name, [CAMEL_CASE, PASCAL_CASE])) {
          report(node.id, name, 'camelCase o PascalCase (componentes)');
        }
      },

      ClassDeclaration(node) {
        if (!node.id) {
          return;
        }

        const name = node.id.name;
        if (!PASCAL_CASE.test(name)) {
          report(node.id, name, 'PascalCase (ej. ShoppingCart)');
        }
      },

      MethodDefinition(node) {
        if (node.kind === 'constructor' || node.key.type !== 'Identifier') {
          return;
        }

        const name = node.key.name;
        if (!matchesAny(name, [CAMEL_CASE, UPPER_SNAKE_CASE])) {
          report(node.key, name, 'camelCase');
        }
      },

      PropertyDefinition(node) {
        if (node.key.type !== 'Identifier') {
          return;
        }

        const name = node.key.name;
        if (!matchesAny(name, [CAMEL_CASE, UPPER_SNAKE_CASE])) {
          report(node.key, name, 'camelCase');
        }
      }
    };
  }
};

export const projectPlugin = {
  meta: {
    name: 'eslint-plugin-project',
    version: '1.0.0'
  },
  rules: {
    'naming-conventions': namingConventionsRule
  }
};
