# ADR-011 — Testing & tooling strategy

**Status:** Accepted · **Date:** 2026-08-27
**Evidence:** `docs/architecture/04-testing-strategy.md`, research corpus

## Decision
- **Vitest** via `@angular/build:unit-test` — Angular v22's default runner for
  new projects. Vitest browser mode with Playwright for component and example
  smoke tests.
- **Harnesses are public API.** Subclass `@angular/aria`'s per-pattern
  harnesses (which extend CDK's `ComponentHarness`) rather than reimplementing
  DOM queries; ship TEKAD harnesses from `@tekad/<pattern>/testing`.
- **Accessibility tests assert behaviour**, never attribute presence:
  keyboard reachability, focus entry/movement/trap/restore, perceivable state
  transitions, and live-region correctness. `axe` runs on every example.
- **SSR/hydration test per package**; **package build + export validation**;
  **tree-shaking probe** (pack → install from tarball → single import →
  `--stats-json` → assert no unrelated module path appears in the metafile);
  **deep-import negative test**.
- **size-limit 13.x** with `@size-limit/esbuild` for per-entry budgets and PR
  comments. `source-map-explorer` (2022) and `bundlesize` (2024) are
  unmaintained and must never be CI gates.
- **Forced-colors visual snapshots** per component, both system themes.
- **Contrast matrix** as a blocking CI gate (ADR-007).
- Performance benchmarks on a pinned self-hosted runner; **size is the hard
  gate, runtime perf is tracked but non-blocking** — shared CI runners have too
  much variance for reliable regression gates.

## Consequences
Baselines are established at Phase 8, not invented now. Every bug fix ships a
regression test that fails before the fix. No test is ever disabled to make CI
green.
