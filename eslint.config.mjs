import nx from '@nx/eslint-plugin';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import jsoncParser from 'jsonc-eslint-parser';
import prettierConfig from 'eslint-config-prettier';

/**
 * TEKAD lint configuration.
 *
 * Dependency-boundary enforcement is wired here on day one, before any package
 * exists. ADR-012: retrofitting boundaries after packages exist is painful, and
 * `@nx/enforce-module-boundaries` is layer two of four — pnpm's strict
 * resolution is below it, ng-packagr's `allowedNonPeerDependencies` throw and
 * the packed-tarball import probe are above it.
 *
 * Because this is an ESLint rule and ESLint rules can be disabled inline, it is
 * gated as `error` and every `allow` entry is a reviewed decision, never a
 * convenience.
 */
export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '**/.nx', '**/coverage', '**/tmp'] },

  /* ----------------------------------------------------------------------- *
   * Layer graph. Dependencies flow DOWNWARD only.
   *
   *   app / probe   ->  integration -> component -> foundation
   *   integration   ->  component   -> foundation
   *   component     ->  foundation
   *   foundation    ->  foundation
   *
   * `layer:foundation` may depend on nothing above it, which is what makes
   * "installing one component must not pull the ecosystem" (ADR-004) an
   * enforceable statement rather than an intention.
   * ----------------------------------------------------------------------- */
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    plugins: { '@nx': nx },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'layer:foundation',
              onlyDependOnLibsWithTags: ['layer:foundation'],
            },
            {
              sourceTag: 'layer:component',
              onlyDependOnLibsWithTags: ['layer:component', 'layer:foundation'],
            },
            {
              sourceTag: 'layer:integration',
              onlyDependOnLibsWithTags: [
                'layer:integration',
                'layer:component',
                'layer:foundation',
              ],
            },
            {
              sourceTag: 'layer:app',
              onlyDependOnLibsWithTags: ['*'],
            },

            /*
             * ADR-008 / CLAUDE.md rule 7: never build a chart engine, and never
             * let one become reachable from core. A charting dependency is
             * banned by NAME from everything that is not explicitly a charts
             * integration, so the invariant survives a package being retagged
             * by mistake.
             */
            {
              sourceTag: '!type:charts',
              bannedExternalImports: [
                'chart.js',
                'chart.js/*',
                'd3',
                'd3-*',
                'echarts',
                'echarts/*',
                'apexcharts',
                'highcharts',
                'plotly.js',
                'plotly.js-*',
              ],
            },

            /*
             * ADR-011: test harnesses are public API, but nothing that ships to
             * a consumer's runtime may depend on a test framework.
             */
            {
              sourceTag: '!type:testing',
              bannedExternalImports: ['vitest', 'vitest/*', '@vitest/*', 'jasmine', 'karma*'],
            },
          ],
        },
      ],
    },
  },

  /* --------------------------- TypeScript --------------------------------- */
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          // CLAUDE.md rule 4 / ADR-004: NgModules are not a public API.
          selector: 'Decorator[expression.callee.name="NgModule"]',
          message:
            'NgModules are not a TEKAD public API (CLAUDE.md rule 4, ADR-004). Use standalone components, directives and providers.',
        },
      ],
    },
  },

  /* --------- Plain JS (build tooling, CI gates, config files) -------------- */
  {
    files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly', URL: 'readonly' },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  /* ---------------------------- Templates --------------------------------- */
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },

  /* --------------------- package.json dependency checks -------------------- */
  {
    files: ['**/package.json'],
    plugins: { '@nx': nx },
    languageOptions: { parser: jsoncParser },
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          // ADR-012 layer three: a dependency used in source but missing from
          // package.json is how a library ships something that resolves in-repo
          // and fails for a consumer.
          buildTargets: ['build'],
          ignoredDependencies: ['tslib'],
        },
      ],
    },
  },

  /* Prettier last: it only turns formatting rules off. */
  prettierConfig,
);
