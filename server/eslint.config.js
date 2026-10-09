const js = require('@eslint/js');
const globals = require('globals');

// Flat config (ESLint 9+): the project is CommonJS. Stylistic rules are
// owned by Prettier (see .prettierrc at the repo root) — ESLint here
// catches real mistakes only.
module.exports = [
  { ignores: ['node_modules/**', 'coverage/**', 'dist/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.vitest }
    },
    rules: {
      // _-prefixed params (e.g. `_req` in handlers that ignore it) are intentional
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
      ]
    }
  },
  // Vitest bundles this config as ESM even though the package is CommonJS
  {
    files: ['vitest.config.js'],
    languageOptions: { sourceType: 'module' }
  }
];
