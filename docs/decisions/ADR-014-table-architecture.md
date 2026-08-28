# ADR-014 — Table & data-grid architecture

**Status:** Accepted · **Date:** 2026-08-27
**Evidence:** `docs/research/11-table-data-grid-strategy.md`

## Decision
**Composable primitives plus a grid layer — four strictly one-directional
layers:** L0 row model (zero DOM) → L1 column model (zero DOM) → L2
interaction & a11y (wraps `@angular/aria` Grid) → L3 rendering (the only DOM
layer). The expensive, correctness-critical work — row identity, focus
management, ARIA index arithmetic — is written once and shared.

**TEKAD owns L3.** Not `@angular/cdk/table`, for three measured reasons: zero
signal APIs in v22 (`input(`/`output(`/`model(`/`computed(`/`signal(` all count
0); its portal rendering **structurally breaks `@angular/aria`'s `ngGridCell`**
with NG0201 (angular/components#32603); and its `StickyStyler` inline offsets
conflict with a transform-based virtual viewport. Owning L3 costs ~2,000 lines
and buys signal-native rendering plus first-party a11y.

**Virtualization: `@tanstack/virtual-core`** (6.7 KB gzip, MIT, dynamic
measurement, both axes), wrapped in a TEKAD signal adapter.
`@angular/cdk/scrolling` ships fixed-size only in stable; its autosize strategy
has been stuck in `cdk-experimental` since 2024.

**Required day one: `rowId: (row, index) => string`** — it feeds `@for` `track`,
selection, expansion, edit buffers and `aria-rowindex` simultaneously.

**Role rule:** native `<table>` for read-only non-virtualized; `role="table"` +
`aria-rowcount`/`aria-rowindex` when virtualized but non-interactive;
`role="grid"` only when 2-D roving-tabindex navigation is actually implemented.

**Gaps to fill over `@angular/aria` Grid:** PageUp/PageDown, F2,
`aria-rowcount`/`aria-colcount`, `aria-sort` plus a polite live region.
**DOM order must equal visual order** — no node pooling.

## Alternatives
Table only — cedes the flagship claim; the alternative for users is AG Grid at
a measured 247.6 KB gzip minimum. Two parallel components — duplicates row
model, selection and a11y code and guarantees divergence.

## Consequences
Deferred to v2+: variable row heights, column virtualization, grouping and
aggregation, editable cells, cell-range selection, tree/master-detail,
column drag-reorder.

**⚠️ Gated on prototype P1:** prove `ngGridCell` registers correctly under
`@for` rendering and that #32603 does not recur. If it fails, L2 collapses and
TEKAD owns the keyboard model — a 5× cost change.

---

## 2026-08-28 — P1 prototype result: **GO**, ADR stands, one requirement added

Evidence: `docs/research/prototypes/p1-aria-grid/` (report, probe app, runner,
raw results). Angular 22.1.x · `@angular/aria` 22.1.4 · `@angular/cdk` 22.1.4 ·
Chromium. Ten rendering paths, each in an isolated page load.

**The gating question is answered: `ngGridCell` registers correctly under
`@for`.** 3 rows × 4 cells, zero NG0201, correct `role`/`aria-rowindex`/
`aria-colindex`, roving `tabindex`, arrow-key navigation moving the active
cell, and dynamic append / insert-at-top / remove all reindexing contiguously
with no errors. **The L2 layer does not collapse; the feared 5× cost change
does not materialise.**

**`cdk-table` reproduced the failure** (`GRID_ROW` missing, 4 of 12 cells) —
angular/components#32603 confirmed by direct observation rather than inferred
from an issue report. Owning the L3 rendering layer is validated.

### Root cause, now understood precisely

Angular resolves directive DI by the template's **declaration site**, not its
DOM insertion point. Templates declared outside the grid fail with `GRID`
missing (the row cannot find the grid); content projection and `cdk-table` fail
with `GRID_ROW` missing (cells cannot find their row). The *same*
`ngTemplateOutlet` mechanism **passes** when the template is declared inside
the row — so template outlets are not the problem, declaration site is.

### New normative requirement (was not anticipated by the research phase)

**Consumer-supplied cell/column templates MUST be rendered with the row's
insertion-site injector** — `ngTemplateOutletInjector`, or
`createEmbeddedView(tpl, ctx, { injector })`. Verified: with the injector the
consumer-template path passes every check; without it, cells silently fail to
register — **no build error and no visible cells**. A regression test must
cover this path specifically.

**Corollary:** TEKAD's cell API is **template-based, not
content-projection-based**. A projected `<td ngGridCell>` is declared in the
consumer's template and cannot be repaired by an injector. Column *definition*
components may use projection; cell *rendering* may not.

### Limitations

Chromium only. Firefox/Safari **UNVERIFIED** — Angular DI is a framework rather
than an engine concern, so parity is expected, but that is an inference and is
not recorded as observed. No assistive technology tested. Virtualization
interaction, `aria-rowcount`/`aria-colcount` under windowing, PageUp/PageDown,
F2, selection semantics and RTL remain untested.

### Methodology defect found and corrected

An `NG0201` thrown during change detection leaves the Angular view inconsistent
and **contaminated the following scenario** — `consumerTemplateWithInjector`
first reported zero cells purely because it ran after a failing scenario. The
runner now reloads the page before every scenario. Any re-run must keep that.
