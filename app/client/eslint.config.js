import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // 1. Ignorar carpetas de compilación
  {
    ignores: ['dist', 'eslint-report.json']
  },

  // 2. Configuración para el FRONTEND (Vite/React)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        // Vite usa import.meta.env, pero si usas process.env por error, 
        // aquí es donde daría el fallo.
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // 3. Configuración para el SERVIDOR (Node.js)
  {
    files: ['server/**/*.js'], 
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node, // Esto define 'process', '__dirname', etc.
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    }
  }
]