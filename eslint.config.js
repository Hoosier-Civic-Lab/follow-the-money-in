// ESLint flat config (ESLint 9+)
// Targets scripts/ and tests/ only.
// Run: npm run lint

export default [
  {
    files: ['scripts/**/*.js', 'tests/**/*.js'],
    rules: {
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-loss-of-precision': 'error',
      'no-return-await': 'error',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    ignores: ['node_modules/', 'src/'],
  },
];
