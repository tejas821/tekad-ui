# Performance Budgets

Performance is an architectural requirement, not a closing optimisation pass.

## Rule zero

TEKAD does not claim to be "lightweight" until measurements support it.
No marketing claim ships ahead of a benchmark.

## What is tracked

| Metric                                | Scope                             |
| ------------------------------------- | --------------------------------- |
| Package size (raw + gzip + brotli)    | every published entry point       |
| Incremental app impact                | probe app importing one component |
| Generated CSS per component           | every component                   |
| Runtime dependency count              | every package                     |
| First render time                     | flagship components               |
| Update / re-render time               | flagship components               |
| DOM node count per component instance | flagship components               |
| Large-list & large-table behaviour    | Table / Data Grid                 |
| Reactive recomputation cost           | Signal-heavy paths                |
| SSR render time and hydration cost    | flagship components               |

## Baselines

Established **2026-09-19**, on the first vertical slice, from the **packed
tarballs** — the bytes a consumer actually downloads — at Angular 22.1.4. They
live in `tools/size-budget.json`, are measured by `tools/verify-size-budget.mjs`,
and CI fails on anything beyond a **2% tolerance**.

Two numbers per package:

- **packed** — the `.tgz` size. This is the download.
- **per entry point** — raw, gzip 9 and brotli 11 of that entry point's shipped
  `.mjs`. An entry point that shares code with the primary bundle references it
  rather than duplicating it (measured in Phase 2), so entry-point bytes are not
  a partition of the package total and must not be read as one.

| Package             | packed   | entry point             | raw      | gzip    | brotli  |
| ------------------- | -------- | ----------------------- | -------- | ------- | ------- |
| `@tekad/button`     | 5.20 KB  | (root)                  | 10.39 KB | 2.93 KB | 2.40 KB |
| `@tekad/checkbox`   | 7.41 KB  | (root)                  | 18.16 KB | 4.57 KB | 3.76 KB |
| `@tekad/core`       | 12.57 KB | (root)                  | 871 B    | 523 B   | 377 B   |
|                     |          | `./a11y/live-announcer` | 6.71 KB  | 2.48 KB | 2.00 KB |
|                     |          | `./forms/model-control` | 1.64 KB  | 861 B   | 676 B   |
|                     |          | `./primitives/identity` | 1.73 KB  | 934 B   | 717 B   |
| `@tekad/dialog`     | 7.17 KB  | (root)                  | 15.76 KB | 4.47 KB | 3.72 KB |
| `@tekad/form-field` | 7.48 KB  | (root)                  | 17.12 KB | 4.38 KB | 3.62 KB |
| `@tekad/forms`      | 6.50 KB  | (root)                  | 943 B    | 562 B   | 421 B   |
|                     |          | `./compat`              | 9.48 KB  | 3.55 KB | 2.92 KB |
| `@tekad/input`      | 6.38 KB  | (root)                  | 13.57 KB | 3.61 KB | 3.04 KB |
| `@tekad/overlay`    | 10.13 KB | (root)                  | 13.87 KB | 4.67 KB | 3.89 KB |
| `@tekad/theme`      | 4.72 KB  | (root)                  | 1.03 KB  | 602 B   | 461 B   |

The theme prompt (`@tekad/theme`) is a stylesheet, not a module: its CSS is
budgeted separately by `tools/verify-css-budget.mjs` against ADR-007's
**~2 KB gzip** for the main sheet and **~1 KB** for the `light-dark()`
fallback, and measured on the built sheet with comments stripped.

### What a regression does

- growth past the tolerance **fails CI**; the number is not updated to match;
- a shrink is reported as a note, with a reminder to lower the committed budget,
  because a budget that only ever ratchets upward is not a budget;
- a new package or entry point without a committed budget **fails**, and so does
  a budget whose package stopped being built — a number nobody measures is worse
  than no number, because it reads as coverage;
- re-baselining is an ADR-level decision about cost, not a way to clear the gate.

### Still not measured here

Size is one of ten metrics in the table above. The rest — incremental app
impact in bytes, first render, update/re-render, DOM node count, large-list and
table behaviour, SSR render and hydration cost — need components that do not
exist yet (`Select`, the table foundation) or a pinned runner
(ADR-011 keeps runtime perf tracked but non-blocking, because shared CI runners
have too much variance for a regression gate). The tree-shaking probe (gate 11)
proves _absence_ of unrelated code in a real bundle; it is not a byte budget.
The SSR encapsulation **cost** is measured in `15-ssr-encapsulation.md` and
enforced by `verify-ssr-encapsulation.mjs`.

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
