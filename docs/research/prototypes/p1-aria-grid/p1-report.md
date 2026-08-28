# P1 — `@angular/aria` `ngGridCell` under real Angular rendering paths

**Gate for ADR-014** (four-layer table architecture; TEKAD owns the rendering
layer). Run 2026-08-28. Raw data: `p1-results.json`. Probe app: `app.ts`.
Runner: `run-p1.mjs`.

Environment: **Angular 22.1.x, `@angular/aria` 22.1.4, `@angular/cdk` 22.1.4**,
Angular CLI 22.1.6 on **Node 26.8.1**, Chromium (Playwright build 1194).

Evidence labels are the P0 vocabulary: **OBSERVED** · **PROVEN IMPLEMENTATION
INVARIANT** · **DEFENSIVE / SIMULATED** · **UNVERIFIED**.

---

## 1. The question

`GridCell` injects its parent `GridRow`, and `GridRow` injects the `Grid`.
angular/components#32603 reports `ngGridCell` throwing
`NG0201: No provider found for GRID_ROW` inside `cdk-table`. The research phase
inferred that CDK's portal rendering severs the DI chain, and ADR-014 was
written on that basis. **P1 tests it directly, and tests whether the rendering
paths TEKAD actually intends to use are affected.**

## 2. Results — Chromium, each scenario in an isolated page load

| # | Rendering path | Rows | Cells | NG0201 | ARIA | Keyboard | Dynamic | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | Static, hand-written (control) | 2/2 | 4/4 | 0 | ✓ | ✓ | n/a | **PASS** |
| 2 | **`@for` rows × `@for` cells** | 3/3 | 12/12 | 0 | ✓ | ✓ | ✓ | **PASS** |
| 3 | `ngTemplateOutlet`, template declared **outside** the grid | 0/3 | 0/12 | 3 | ✗ | — | — | **FAIL** |
| 4 | Content projection across a component boundary | 3/3 | 0/12 | 3 | ✗ | — | — | **FAIL** |
| 5 | `ViewContainerRef.createEmbeddedView`, template outside | 0/3 | 0/12 | 2 | ✗ | — | — | **FAIL** |
| 6 | `ngTemplateOutlet`, template declared **inside the row** | 3/3 | 12/12 | 0 | ✓ | ✓ | ✓ | **PASS** |
| 7 | **Consumer-supplied template**, no injector | 3/3 | 0/12 | 3 | ✗ | — | — | **FAIL** |
| 8 | **Consumer-supplied template + insertion-site injector** | 3/3 | 12/12 | 0 | ✓ | ✓ | ✓ | **PASS** |
| 9 | Cells containing `ngGridCellWidget` | 3/3 | 12/12 | 0 | ✓ | ✓ | ✓ | **PASS** |
| 10 | **`cdk-table` (control — expected to fail)** | 2/3 | 4/12 | 2 | ✗ | — | — | **PASS** (reproduced) |

All **OBSERVED** in Chromium.

## 3. Root cause — one mechanism, not five

The failing scenarios report two different missing tokens, and the difference
is diagnostic:

| Path | Missing token | Meaning |
|---|---|---|
| Template outlet declared outside; `ViewContainerRef` | **`GRID`** | the *row* could not find the grid |
| Content projection; consumer template; **`cdk-table`** | **`GRID_ROW`** | rows registered, but *cells* could not find their row |

**Root cause: Angular resolves directive DI by the template's *declaration*
site, not its DOM insertion point.** An embedded view inherits the injector
where its `<ng-template>` was written. Every failure above is the same fact:

- a template declared at the component root renders `<tr ngGridRow>` into the
  table, but the row still resolves DI at the root — no `GRID` there;
- content projected into a child component is declared in the *parent*, so a
  projected `<td ngGridCell>` cannot see the `GRID_ROW` the child provides;
- `cdk-table` renders cells through portals whose templates are declared
  outside the row — the same `GRID_ROW` failure, confirming #32603.

Scenario 6 isolates the variable: the *same* `ngTemplateOutlet` mechanism works
when the template is declared inside the row. **Template outlets are not the
problem; declaration site is.**

## 4. The finding that shapes TEKAD's column API

A table library must let consumers supply cell and column templates. Scenario 7
shows the naive form fails. **Scenario 8 shows it is repairable**: passing the
row's own injector to the embedded view
(`ngTemplateOutletInjector`, or `createEmbeddedView(tpl, ctx, { injector })`)
restores the DI chain completely — cells register, ARIA indices are correct,
roving `tabindex` works, arrow-key navigation moves the active cell, and
dynamic add/insert/remove reindex correctly.

The injector is captured by a one-line directive on the row host and handed to
the outlet. Cost: a directive plus one binding. **This is a hard requirement on
TEKAD's rendering layer, not an optional optimisation.**

**Not repairable the same way:** content projection (scenario 4). A projected
`<td>` is declared in the consumer's template and Angular offers no per-element
injector override for projected content. **TEKAD's cell API must therefore be
template-based (`<ng-template>` + explicit injector), not
content-projection-based.** Column *definition* components may still use
projection; the cell *rendering* may not.

## 5. What this confirms and what it changes

**Confirms ADR-014.** `cdk-table` reproduces #32603 (`GRID_ROW`, 4 of 12 cells).
Building the rendering layer on `cdk-table` would forfeit `@angular/aria`'s
grid accessibility. TEKAD owning L3 is validated by direct observation rather
than by inference from an issue report.

**Confirms the `@for` decision.** The primary path passes every check,
including dynamic mutation: append, insert-at-top and remove all reindex
`aria-rowindex`/`aria-colindex` contiguously with no errors.

**Adds a new normative requirement** (§6.3 below) that the research phase did
not anticipate: the insertion-site injector.

## 6. Requirements added to the table contract

1. **Render rows and cells with `@for` in a template declared inside the grid.**
   Verified end to end, including dynamic mutation.
2. **Never render `@angular/aria` grid parts through `cdk-table`, portals, or
   any template declared outside the grid**, unless the insertion-site injector
   is supplied.
3. **Consumer-supplied cell/column templates MUST be rendered with the row's
   injector** — `ngTemplateOutletInjector`, or `createEmbeddedView(tpl, ctx,
   { injector })`. Without it the cells silently fail to register.
4. **The cell API is template-based, not content-projection-based.** Projected
   cells resolve DI at the consumer's declaration site and cannot be repaired
   by an injector.
5. `rowIndex` / `colIndex` are consumer-supplied inputs on both row and cell;
   `@angular/aria` does not derive them, and does not emit `aria-rowcount` /
   `aria-colcount` (consistent with the research finding).
6. **A regression test must cover the consumer-template + injector path.** It
   is the fragile one: omitting the injector produces no build error and no
   visible cells — a silent failure.

## 7. Limitations — what this does NOT establish

- **UNVERIFIED: Firefox/Gecko and Safari.** Only Chromium was executed.
  Angular DI resolution is a framework concern rather than an engine one, so
  cross-engine parity is *expected* — but that is an **inference**, explicitly
  not reported as observed.
- **UNVERIFIED: assistive technology.** ARIA attributes, roving `tabindex` and
  active-cell movement were read from the DOM. No screen reader was tested.
- **Not tested:** virtualization interaction, `aria-rowcount`/`aria-colcount`
  with windowed data, PageUp/PageDown and F2 (known `@angular/aria` gaps),
  selection semantics, RTL, and grids larger than a handful of rows.
- The keyboard assertions dispatch synthetic `keydown` events, not OS-level
  key presses.

## 8. Methodology defects found and corrected

Recorded so a re-run does not repeat them:

1. **Test isolation.** An `NG0201` thrown during change detection leaves the
   Angular view inconsistent and **contaminated the next scenario**:
   `consumerTemplateWithInjector` first reported 0 cells purely because it ran
   after a failing scenario. In isolation it passes fully. The runner now
   reloads the page before every scenario. *Any future run must keep this.*
2. **Inapplicable assertions.** The static control renders hand-written rows,
   so add/remove are no-ops; dynamic checks are now `n/a` there rather than
   FAIL.
3. Scenario switching can throw synchronously; the runner captures the throw
   instead of letting it abort the run.

## 9. P1 VERDICT

**GO.** `@angular/aria`'s Grid registers correctly under the rendering path
TEKAD intends to use (`@for`), including dynamic rows, and the
consumer-template path is viable provided the insertion-site injector is
supplied. ADR-014 stands, with one new normative requirement.

The L2 layer does **not** collapse. The 5× cost change feared in ADR-014 does
not materialise.
