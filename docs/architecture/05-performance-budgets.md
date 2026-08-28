# Performance Budgets

Performance is an architectural requirement, not a closing optimisation pass.

## Rule zero

TEKAD does not claim to be "lightweight" until measurements support it.
No marketing claim ships ahead of a benchmark.

## What is tracked

| Metric | Scope |
|---|---|
| Package size (raw + gzip + brotli) | every published entry point |
| Incremental app impact | probe app importing one component |
| Generated CSS per component | every component |
| Runtime dependency count | every package |
| First render time | flagship components |
| Update / re-render time | flagship components |
| DOM node count per component instance | flagship components |
| Large-list & large-table behaviour | Table / Data Grid |
| Reactive recomputation cost | Signal-heavy paths |
| SSR render time and hydration cost | flagship components |

## Baselines

Baselines are established when the first vertical slice exists (Phase 9), not
before. Numeric budgets written today would be invented, not measured — and
inventing them would violate the no-speculation rule.

Once baselines exist:

- every budget has a committed number and a tolerance;
- CI fails on a regression beyond tolerance;
- a regression is investigated, not re-baselined, unless an ADR justifies the
  new cost.

## Flagship set

Button, Input, Select, Dialog, Table/Data Grid. The Table set must include a
large-dataset scenario.

## Standing performance rules

- No unnecessary DOM wrapper elements.
- No global stylesheet every consumer must download.
- No runtime style engine unless measured to beat static CSS.
- Prefer `computed` derivation over `effect`-based synchronisation.
- No import-time work; no global registration.
- Lazy where lazy is genuinely cheaper, measured.
