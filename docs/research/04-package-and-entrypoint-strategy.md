# Package, Entry-Point & Monorepo Strategy

Research date 2026-08-26. Sources: npm registry metadata, unpacked tarballs
(`@angular/build@22.1.6`, `@angular/material@22.1.4`, `ng-packagr@22.1.1`,
`@nx/angular@23.1.1`), Angular Package Format docs, Nx docs, pnpm docs.

## Angular Package Format v22 — what ng-packagr does for you

- Required layout: `README.md`, `package.json`, `fesm2022/`, `types/`;
  `"type": "module"` required.
- **ng-packagr generates the `exports` map**: exactly `"./package.json"`,
  `"."`, and one key per secondary entry point, each `{types, default}`.
  It emits **no wildcard subpath**. Verified empirically: `@angular/material`
  has 86 export keys, **zero** containing `src`.
- ⇒ **"`./src/*` is not importable" comes free**, provided you never hand-write
  a `"./*"` fallback and never set `"typesVersions"` (a legacy-resolver back
  door). Assert this in CI.
- `sideEffects` defaults to `false` unless overridden.
- Secondary entry points are declared by an `ng-package.json` in a
  subdirectory — it may literally be `{}`.
- **Partial compilation is enforced**: if `compilationMode` is not `partial`,
  ng-packagr injects a `prepublishOnly` script that fails the publish. That is
  a lifecycle script, so it will not fire under `--ignore-scripts`; assert
  `compilationMode: "partial"` in CI too.
- ng-packagr also **throws** if a built package has non-peer `dependencies`
  not listed in `allowedNonPeerDependencies` — a genuine dependency boundary.
- It rewrites the published `package.json`, deleting `devDependencies`,
  `workspaces`, `scripts`, `husky`, `jest`, `prettier`, `stylelint`,
  `browserslist`, `ngPackage`. **Published-artifact lock-in is therefore zero
  regardless of monorepo tool** — Nx, Turborepo and Angular CLI all emit
  byte-identical output.

## The packaging idea worth stealing

Material's root `material.mjs` is **153 bytes**. Real code lives in
per-entry-point FESM files plus shared private chunks
(`_form-field-chunk.mjs`, `_ripple-chunk.mjs`, …). This is code splitting at
publish time rather than trusting the consumer's bundler to tree-shake.

⚠️ **Stock ng-packagr does not produce this chunking.** Material achieves it
with a Bazel + Rollup/esbuild pipeline. Budget explicit work, or accept
coarser per-entry bundles in v1 and measure the difference.

## Entry-point namespace

Adopt Taiga's **two-level, category-prefixed** shape rather than Material's
flat one:

```
@tekad/core/components/button
@tekad/core/directives/appearance
@tekad/cdk/utils/dom
@tekad/<pattern>/testing
```

It stays navigable past 100 entry points and gives non-component exports a
stable home. Retrofitting it later is a breaking change for every consumer.

## Monorepo tooling — measured comparison

| Criterion             | Nx 23.1 | Angular CLI + pnpm + Changesets | Turborepo + ng-packagr |
| --------------------- | ------- | ------------------------------- | ---------------------- |
| Angular v22 alignment | 7       | **10**                          | 8                      |
| Library-build support | 9       | 8                               | 7                      |
| Boundary enforcement  | **9**   | 7                               | 6                      |
| Release support       | **10**  | 8                               | 8                      |
| CI cost               | 6       | 5                               | 8                      |
| Lock-in               | 6       | **10**                          | 9                      |
| Maintainability       | 8       | 7                               | 6                      |
| **Total**             | **55**  | **55**                          | 52                     |

### The two facts that decide it

1. **Nx lags Angular majors.** `@nx/angular@22.7.8` hard-caps at Angular
   `<22.0.0`; Angular 22 support arrived only in **Nx 23.1 (2026-07-15)** —
   roughly six weeks after the framework. Expect the same for v23.
2. **Nx's free remote cache is gone.** `@nx/s3-cache`, `@nx/gcs-cache`,
   `@nx/azure-cache`, `@nx/shared-fs-cache` are all **deprecated and
   commercially licensed**, withdrawn over **CVE-2025-36852 (CREEP)**: a PR can
   modify the CI workflow to build a malicious artifact, and because the
   workflow is not part of the cache key, the cache is poisoned for later
   legitimate builds. An OSS repo taking fork PRs _is_ that threat model.

### Decision

Nx and Angular CLI tie on score but fail differently. At 15–30 packages with
independent builds, tests and scalable CI as explicit requirements, the plain
Angular CLI path means hand-building a task graph, affected detection and
release orchestration — reinventing a worse Nx. Nx ships all three plus
`nx migrate`, and published output is identical either way, so lock-in is
repo-side and mechanically reversible.

**Take Nx — with two conditions:**

- Accept a 4–8 week lag on every Angular major. If TEKAD's positioning is
  "day-one support for every Angular release", that promise is incompatible
  with Nx; take Angular CLI + pnpm + Changesets + Turborepo instead.
- **Do not depend on Nx remote caching.** Free local cache + `nx affected`;
  remote-cache writes only from `main`; Nx Cloud free tier as optional
  acceleration, never architecture.

⚠️ **Unverified, must be spiked:** whether `@nx/angular@23.1.1`'s Angular
executors avoid the deprecated `@angular-devkit/build-angular` path on v22 —
it is still an optional peer, and webpack builders are deprecated in v22.

## Package manager: pnpm 11.24.0 — non-negotiable

pnpm's non-flat `node_modules` means **only direct dependencies resolve**.
Phantom dependencies — the primary way a library monorepo ships something that
works in-repo and breaks for consumers — become an **install-time error**
rather than a code-review responsibility. That is TEKAD's strict-boundary
requirement enforced one layer below lint, where it cannot be `eslint-disable`d.
Best CI install profile too (single content-addressable store, hard-linked).

npm hoists. Yarn Classic is frozen at 1.22.22 (2024). Yarn Berry PnP is
unverified against Angular 22 tooling. Bun hoists by default, so it provides
none of the boundary benefit.

## Boundary enforcement — four layers, not one

1. **pnpm strict resolution** — fails at resolution time. Cannot be disabled.
2. **`@nx/enforce-module-boundaries`** — tags + `depConstraints` +
   `banTransitiveDependencies`. Expressive, but it is an ESLint rule and is
   `eslint-disable`-able; gate as error in CI and code-review every `allow`.
3. **ng-packagr `allowedNonPeerDependencies`** — throws at build time.
4. **Packed-tarball import probe** (below) — the final gate.

## Tree-shaking verification — CI probe

The `ng-packagr` builder schema exposes only `project`, `tsConfig`, `watch`,
`poll` — **no budgets**. Size gates must come from outside the library build.

1. **Import-graph probe app.** `npm pack` each package, install from the
   tarballs, import exactly one entry point, build with
   `--configuration production --stats-json`, parse the esbuild metafile and
   **assert no module path from an unrelated entry point appears in `inputs`**.
   This is the only test that proves absence.
2. **Deep-import negative test** — `import '@tekad/x/src/lib/foo'` must fail
   to resolve.
3. **size-limit 13.0.3** with `@size-limit/esbuild` — per-entry byte budgets,
   brotli, `--why`, PR comments, CI failure.

`source-map-explorer` (2022) and `bundlesize` (2024) are unmaintained;
Statoscope's last release was 2025-04 and it is webpack-oriented. Use none as
CI gates.

## Release

**Nx Release** has the most complete multi-package story:
`projectsRelationship: "independent"`, per-project tags and changelogs,
`updateDependents`. **Changesets 3.0.1** is the better _open-source_ ritual —
contributors declare intent in a markdown file in the PR — and is tool-neutral.
Lerna 10 is maintained by the Nx team and depends on Nx; it is not an
independent choice.

Use forward-compatible peer ranges (`^22.0.0 || ^23.0.0`, as CDK does). Avoid
exact-pinned cross-package peers until release automation is proven — Material
and Taiga can afford lockstep because they ship the whole family on a fixed
cadence; a young library cannot.
