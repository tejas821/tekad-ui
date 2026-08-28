# CI Quality Gates

`main` is never knowingly broken.

## Required gates

| # | Gate | Blocking |
|---|---|---|
| 1 | Install from committed lockfile | yes |
| 2 | Format check | yes |
| 3 | Lint | yes |
| 4 | Typecheck | yes |
| 5 | Unit + component tests | yes |
| 6 | Accessibility tests | yes |
| 7 | SSR / hydration tests | yes |
| 8 | Package builds (every entry point) | yes |
| 9 | Package validation — exports, types, ESM, `sideEffects`, no internal leakage | yes |
| 10 | Dependency-boundary check — no cycles, no upward deps, charts not reachable from core | yes |
| 11 | Tree-shaking probe — single-import app contains no unrelated TEKAD code | yes |
| 12 | Dependency vulnerability audit | yes |
| 13 | License audit of the dependency tree | yes |
| 14 | Bundle-size budgets | yes, once baselines exist |
| 15 | Performance benchmarks | report first; blocking once baselines exist |
| 16 | Documentation build | yes |

## Supply-chain baseline

Proportionate to a founder-led project, not enterprise theatre:

- committed lockfile; dependency changes reviewed explicitly;
- least-privilege CI tokens; no long-lived secrets in workflows;
- automated dependency and license scanning on every PR;
- npm provenance on publish where available;
- a documented security disclosure path (`SECURITY.md`) before first publish;
- release from CI, never from a developer machine.

## Release safety

Experimental and internal packages must be impossible to publish by accident —
enforced by package metadata and a publish allowlist, not by discipline alone.
