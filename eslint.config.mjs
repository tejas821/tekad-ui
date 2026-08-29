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
    },
  },

  /* --------- Plain JS (build tooling, CI gates, config files) -------------- */
  {
    files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      /*
       * The Node globals these build scripts actually use. Listed explicitly
       * rather than pulled from a `globals` package: the list is short, it
       * documents what the tooling layer depends on, and an unexpected name
       * appearing here is a signal worth seeing in review.
       */
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  /* ------------------ ADR-002 / ADR-003: reactive discipline ---------------
   * These four patterns are not stylistic. Each is listed verbatim in an ADR
   * as something "code review specifically rejects" — and a rule that lives
   * only in a reviewer's head stops being enforced the first busy week.
   *
   * Scoped to `packages/` on purpose: an application, a probe or a test may
   * legitimately do any of these while adapting to something else's API. The
   * constraint is on what TEKAD ITSELF ships.
   * ---------------------------------------------------------------------- */
  {
    files: ['packages/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              /*
               * ADR-005: "Never build on `@angular/aria/private` — it carries no
               * compatibility guarantee."
               *
               * It is a real, published entry point, so importing it works and
               * nothing else complains. The cost lands later: it can change or
               * vanish in a patch release, and TEKAD would be shipping a
               * dependency on Angular's internals to every consumer.
               */
              group: ['@angular/aria/private', '@angular/aria/private/*'],
              message:
                'ADR-005: @angular/aria/private carries no compatibility guarantee and can change in a patch release. Build on a public Aria entry point, or own the behaviour in TEKAD.',
            },
            {
              /*
               * The same reasoning for Angular's own private surface. `ɵ`-prefixed
               * symbols are exported for the framework's internal use.
               */
              group: ['@angular/*/private', '@angular/*/*/private'],
              message:
                'This is a private Angular entry point with no compatibility guarantee. Use the public API.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // CLAUDE.md rule 4 / ADR-004: NgModules are not a public API.
          selector: 'Decorator[expression.callee.name="NgModule"]',
          message:
            'NgModules are not a TEKAD public API (CLAUDE.md rule 4, ADR-004). Use standalone components, directives and providers.',
        },
        {
          /*
           * ADR-003: "An internal Subject holding state is a review blocker; a
           * Subject modelling an event stream is fine."
           *
           * BehaviorSubject and ReplaySubject are state by construction — they
           * exist to replay a current value. A plain Subject is an event
           * stream and stays allowed, which is what makes this rule precise
           * rather than a blanket ban on RxJS.
           */
          selector: 'NewExpression[callee.name=/^(BehaviorSubject|ReplaySubject)$/]',
          message:
            'ADR-002/ADR-003: signals are the canonical state model. A BehaviorSubject or ReplaySubject IS state — it exists to replay a current value — so this creates a second source of truth that must be kept in sync. Use a signal, and derive an Observable at the public boundary with toObservable() if consumers need one. A plain `Subject` modelling an event stream is fine.',
        },
        {
          /*
           * ADR-002: "effect() is reserved for genuine side effects at the edge
           * (DOM, focus, announcements) — never to copy one reactive value into
           * another." A `.set()`/`.update()` inside an effect is that copy.
           */
          selector:
            'CallExpression[callee.name="effect"] CallExpression[callee.property.name=/^(set|update)$/]',
          message:
            'ADR-002: effect() is for genuine side effects at the edge (DOM, focus, announcements), never to copy one reactive value into another. Writing a signal inside an effect makes the derivation implicit, ordering-dependent and impossible to read off the declaration. Use computed() instead.',
        },
        {
          /*
           * A toSignal(toObservable(x)) round-trip converts a signal to an
           * Observable and straight back, paying subscription and scheduling
           * cost to arrive where it started — and losing synchronous, glitch-
           * free semantics on the way.
           */
          selector:
            'CallExpression[callee.name="toSignal"] > CallExpression[callee.name="toObservable"]',
          message:
            'ADR-002/ADR-003: this is a toSignal(toObservable(x)) round-trip. It leaves the signal graph and comes back, paying subscription and scheduling cost to arrive where it started, and loses the synchronous glitch-free semantics on the way. Use the signal directly, or computed() if it needs deriving.',
        },
        {
          /*
           * Hand-rolled subscribe-then-set is the manual version of toSignal:
           * it needs teardown bookkeeping, has no initial value, and silently
           * leaks if the subscription outlives the component.
           */
          selector:
            'CallExpression[callee.property.name="subscribe"] CallExpression[callee.property.name=/^(set|update)$/]',
          message:
            'ADR-003: copying an Observable into a signal by hand needs teardown bookkeeping, has no initial value, and leaks if the subscription outlives its owner. Convert once at the boundary with toSignal() instead.',
        },
      ],
    },
  },

  /* -------------------- browser drivers (Playwright) ----------------------- *
   * These files run in Node, but the bodies passed to `page.evaluate()` are
   * serialised and executed inside the BROWSER, where `document`, `window` and
   * `MutationObserver` are exactly right. Listed explicitly rather than by a
   * loose glob: a browser global appearing in any other tooling file is a
   * mistake worth catching, and this exception should stay small enough to read.
   * ------------------------------------------------------------------------ */
  {
    files: ['tools/verify-live-announcer.mjs', 'tools/verify-treeshaking.mjs'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        getComputedStyle: 'readonly',
        MutationObserver: 'readonly',
        HTMLElement: 'readonly',
      },
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
