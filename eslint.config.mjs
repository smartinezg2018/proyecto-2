import js from '@eslint/js';
import checkFile from 'eslint-plugin-check-file';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import { projectPlugin } from './eslint/project-plugin.mjs';

/** camelCase | PascalCase | kebab-case (micromatch) — módulos, utilidades y clases */
const jsFilenamePattern =
  '@(+([a-z])*([a-z0-9])*([A-Z]*([a-z0-9]))|*([A-Z]*([a-z0-9]))|+([a-z])*([a-z0-9])*(-+([a-z0-9])))';

const namingRules = {
  // Sin snake_case en identificadores; UPPER_SNAKE_CASE permitido por camelcase
  camelcase: [
    'error',
    {
      properties: 'always',
      ignoreDestructuring: true,
      ignoreImports: true,
      ignoreGlobals: true
    }
  ],
  // Constructores: new Foo() con PascalCase
  'new-cap': [
    'error',
    {
      newIsCap: true,
      capIsNew: false,
      properties: true
    }
  ],
  // Estándares de GUIA_ESTILO.md / Guidelines
  'project/naming-conventions': 'error'
};

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/package-lock.json']
  },
  js.configs.recommended,
  {
    files: ['apps/api/**/*.{js,mjs,cjs}', 'apps/web/**/*.{js,jsx}'],
    plugins: {
      'check-file': checkFile,
      'unused-imports': unusedImports,
      project: projectPlugin
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      ...namingRules
    }
  },
  {
    files: ['apps/api/**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ['apps/web/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ['apps/**/*.js'],
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.js': jsFilenamePattern
        },
        {
          ignoreMiddleExtensions: true
        }
      ]
    }
  },
  {
    files: ['apps/web/**/*.jsx'],
    ignores: ['**/main.jsx'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'check-file': checkFile
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-pascal-case': [
        'error',
        {
          allowAllCaps: false,
          allowNamespace: true
        }
      ],
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.jsx': 'PASCAL_CASE'
        },
        {
          ignoreMiddleExtensions: true
        }
      ]
    }
  },
  {
    files: ['apps/web/**/main.jsx'],
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-pascal-case': [
        'error',
        {
          allowAllCaps: false,
          allowNamespace: true
        }
      ]
    }
  },
  prettier
];
