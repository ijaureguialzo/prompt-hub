import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import globals from 'globals'

// Flat config (ESLint 9+). Stylistic rules belong to Prettier (see the
// root .prettierrc); ESLint catches real mistakes.
//
// typescript-eslint's shipped flat config is NOT file-scoped (its base
// entry sets the TS parser for every file), so it is re-scoped here to
// real TS files — otherwise it would leak into .js and .vue sources.
const tsFlat = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: ['**/*.ts', '**/*.tsx']
}))

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.js'] },
  js.configs.recommended,
  ...tsFlat,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      // _-prefix marks intentionally unused params
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
      ]
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      // The core rule only sees the <script> block and would false-positive
      // on props/emit/bindings used from the template; the Vue variant
      // understands both sides.
      'no-unused-vars': 'off',
      'vue/no-unused-vars': 'error',
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
      ],
      // Mock-heavy test code: `any` is acceptable there
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['tests/**/*', 'vitest.config.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest } }
  },
  // Must be last: turns off stylistic rules that would fight Prettier
  prettier
]
