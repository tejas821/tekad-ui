# Current task

**Phase 0 (foundation), Phase 0.5 (research), the P0/P1 gates and the two
pre-scaffold spikes are all complete.** `IMPLEMENTATION_HANDOFF.md` at the
repository root is the authoritative input. Do not re-read the research corpus
to start work.

## Gate status

| Gate | Status | Artifact |
|---|---|---|
| **P0** overlay exit lifecycle | CLOSED — CONDITIONAL GO | `docs/research/prototypes/p0-overlay/` |
| **P1** `ngGridCell` under `@for` | CLOSED — GO | `docs/research/prototypes/p1-aria-grid/` |
| **Spike A** auto-import vs secondary entry points | CLOSED — Q1 resolved, Q2 unverified | `docs/research/prototypes/spike-a-autoimport/` |
| **Spike B** Nx/Angular build routing | CLOSED — GO | `docs/research/prototypes/spike-b-nx-angular-build/` |

No ADR is provisional. ADR-004 and ADR-012 are both fully Accepted.

## Next: Phase 1 — workspace scaffold

Nx + pnpm workspace, git init, lint, format, typecheck, and the
dependency-boundary rules wired from day one — retrofitting boundaries after
packages exist is painful.

**Spike B constrains how this is done. Do not scaffold the obvious way:**

1. **Legacy TypeScript setup only.** Nx 23's default TS-solution setup
   (`composite`, project references, npm `workspaces`) is *refused* by
   `@nx/angular` generators — angular/angular#37276. Use
   `tsconfig.base.json` + `paths`. `NX_IGNORE_UNSUPPORTED_TS_SETUP` is not
   acceptable for a foundation.
2. **Do not use `--preset=angular-monorepo`.** It resolves to a fixed GitHub
   template and ignores `--appName`/`--ssr`/`--routing`. Build from an empty
   workspace and add projects with generators.
3. **Pin Angular explicitly after scaffolding.** `@nx/angular` 23.1.1 pins
   `~22.0.4`; the P0/P1 gates were measured against **22.1.4**.
4. **Do not declare `@angular-devkit/build-angular`**, and assert in CI that it
   is absent from the lockfile — it arrives as an optional peer of both
   `@nx/angular` and the vitest-analog runner.
5. **Re-measure the optional-peer install path under pnpm.** Spike B ran on npm.

## Phase 2 carries three items Spike B created

- Write a **TEKAD secondary-entry-point generator** — the stock one emits a
  flat, one-level entry point containing an **NgModule**.
- Add a **lint rule forbidding relative imports across entry-point boundaries**;
  ng-packagr catches them, but with an unreadable internal crash.
- Build the **CI tree-shaking probe app**. Spike B showed the mechanism works
  for one ballast symbol in one app; that is not the same as holding for
  TEKAD's real package graph, where DI tokens, module-level side effects and
  `providedIn: 'root'` services are what actually defeat tree-shaking.

## Publish gate — independent of all the above
Nothing is published until ADR-016's gates pass: npm scope availability,
placeholder registration **before the name is announced publicly**, and
professional trademark clearance for India, Indonesia and Malaysia.

## Tracked, not blocking
Firefox/Gecko and real Safari for P0 and P1, screen-reader validation,
`prefers-reduced-motion` in WebKit, synchronous `toggle` delivery, and the
Angular Language Service template path (Spike A Q2).
