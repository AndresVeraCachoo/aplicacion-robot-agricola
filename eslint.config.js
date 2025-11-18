import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config' // Asumo que esta importación te funciona

export default defineConfig([
  // 1. Ignorar carpeta de build
  globalIgnores(['dist']),

  // 2. Configuración PRINCIPAL (React / Frontend / General)
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser, // Define 'window', 'document', etc.
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // 3. Configuración EXCLUSIVA para el Servidor (Backend)
  {
    // Solo aplica a archivos dentro de la carpeta server
    files: ['server/**/*.js'], 
    languageOptions: {
      // Mezcla los globales existentes con los de Node.js
      globals: {
        ...globals.node, 
      }
    },
    rules: {
      'react-refresh/only-export-components': 'off' 
    }
  }
])