# Table / Data Grid Strategy

Research date 2026-08-27. Bundle figures measured (clean install, esbuild
`--bundle --minify --format=esm`, Angular/rxjs external, gzip -9).

## Measured landscape

| Library                               | min     | **gzip**     | Notes                          |
| ------------------------------------- | ------- | ------------ | ------------------------------ |
| `@angular/cdk/table`                  | 87.0 KB | **18.8 KB**  | Skeleton + sticky only         |
| `@angular/cdk/scrolling`              | 38.8 KB | 9.3 KB       | **Fixed-size strategy only**   |
| `@angular/aria/grid`                  | 37.0 KB | **8.4 KB**   | Keyboard/focus/selection model |
| `@tanstack/table-core` (core only)    | 23.6 KB | **7.3 KB**   | v9, stable 2026-08-04          |
| `@tanstack/table-core` (all features) | 76.2 KB | 20.3 KB      | Tree-shaking is real           |
| `@tanstack/virtual-core`              | 22.3 KB | **6.7 KB**   | Dynamic measurement, both axes |
| AG Grid community (minimal)           | 871 KB  | **247.6 KB** | ~13× cdk/table                 |
| AG Grid `AllCommunityModule`          | 1085 KB | 303.6 KB     | Enterprise from $999/dev       |

## What `@angular/cdk/table` actually is

Column-major definition: each `cdkColumnDef` owns its header/cell/footer
templates; row defs name an ordered column array; cells are stamped into row
outlets via portals. Accepts array, Observable or `DataSource`.

**It implements sticky and nothing else.** Case-insensitive occurrence counts
in the shipped bundle: `sticky` 213; `sort` 0, `paginat` 0, `reorder` 0,
`aggregate` 0, `expand` 0, `edit` 0.

**It has zero signal APIs in v22.** `input(`, `output(`, `model(`, `computed(`,
`signal(`, `effect(`, `linkedSignal(` all count **0**. It still uses
`IterableDiffers`, `BehaviorSubject`, `Subject`, `takeUntil`.

Column resize, popover edit and selection sit in `@angular/cdk-experimental`
and have not been promoted across multiple majors. The Angular roadmap lists
no table or data-grid item at all.

## What `@angular/aria/grid` provides — decompiled from 22.1.4

**Inputs on `ngGrid`:** `enableSelection`, `disabled`, `softDisabled`,
`focusMode: 'roving' | 'activedescendant'`, `rowWrap`/`colWrap`
(`continuous | loop | nowrap`), `multi`, `selectionMode: 'follow' | 'explicit'`,
`tabindex`. Members: `element`, `activeDescendant`,
`scrollActiveCellIntoView()`. Host emits `role="grid"`, `aria-disabled`,
`aria-multiselectable`, `aria-activedescendant`.

`ngGridRow` → `role="row"` + `aria-rowindex`. `ngGridCell` writes, inside an
`afterRenderEffect`: `role`, `id`, `rowspan`, `colspan`, `aria-rowspan`,
`aria-colspan`, `data-active`, `data-anchor`, `aria-disabled`,
`aria-rowindex`, `aria-colindex`, `aria-selected`, `tabindex`.

**Keymap:** arrows (RTL-aware horizontally); `Home`/`End` first/last in row;
`Ctrl+Home`/`Ctrl+End` first/last. With selection: `Enter`/`Space` toggle,
`Ctrl+A` select all, `Shift+Space` select row, `Ctrl+Space` select column.
Widgets: `Enter`/`Space` activate, `Escape` deactivate; for
`widgetType === 'editable'`, any alphanumeric key activates.

**Gaps TEKAD must fill:** no `PageUp`/`PageDown` anywhere in the grid pattern.
No `F2`. No `aria-rowcount` / `aria-colcount`. No column model, no data, no
rendering, no sorting, no `aria-sort`, no virtualization awareness.

### The finding that decides the architecture

**`ngGridCell` throws NG0201 "No provider found for GRID_ROW" when used inside
`cdk-table`** — CDK's portal rendering severs the DI tree between cell and row.
Issue #32603, opened 2025-12-28, still open ("needs: clarification").

**You cannot have both `@angular/cdk/table` and `@angular/aria`'s grid
accessibility.** Combined with cdk/table's zero signal APIs and its
`StickyStyler` inline-offset approach conflicting with a transform-based
virtual viewport, this settles it: **TEKAD owns the rendering layer.**

## Virtualization

`@angular/cdk/scrolling` ships **only** `FixedSizeVirtualScrollStrategy` in
stable. `AutoSizeVirtualScrollStrategy` lives in `cdk-experimental`, Angular's
docs say it "is not ready for production use yet," and tracking issue #29025
(opened 2024-05-09) closed without shipping. Horizontal is supported on a
single axis; there is no 2-D windowing.

**Use `@tanstack/virtual-core`** (6.7 KB gzip, MIT): a measurement/offset
calculator rather than a viewport component, so it composes with `@for` and
signals instead of owning the DOM. Dynamic measurement, both axes, smaller
than CDK's fixed-only strategy. Wrap it in a TEKAD signal adapter rather than
taking `@tanstack/angular-virtual`.

### Four traps, evidenced

1. **DOM-order recycling destroys screen-reader navigation** even with correct
   `aria-rowindex`. DOM order must equal visual order — this forbids naive
   node pooling.
2. **Keyboard into unrendered rows.** `Ctrl+End` must set the logical active
   index, scroll, wait for render, then focus — a two-phase operation, and the
   top source of "focus lands nowhere" bugs. APG explicitly warns that key
   events "may move focus to the last row in the DOM rather than the last
   available row in the back-end data."
3. **Pagination vs virtualization indices.** With client pagination
   `aria-rowcount` is the page's row count and `aria-rowindex` is the position
   within the page; with virtualization `aria-rowcount` is the dataset.
   **Header rows count toward the index.** `-1` means unknown.
4. **Sticky + virtualization.** A virtual viewport uses `transform: translateY`
   on the content wrapper, which creates a containing block that **breaks
   `position: sticky` for descendants**. The header must live outside the
   transformed element and be synchronised by scroll offset — which
   reintroduces horizontal sync and column measurement.

## Accessibility role selection

Use `role="grid"` only when the widget always contains multiple focusable
elements and only one is in the page tab sequence. `table` keeps all focusable
elements in the tab sequence.

**TEKAD rule:** native `<table>` semantics (no ARIA role) for read-only,
non-virtualized, ≤1 interactive element per row; `role="table"` +
`aria-rowcount`/`aria-rowindex` when virtualized but non-interactive;
`role="grid"` **only** when 2-D roving-tabindex navigation is actually
implemented. Applying `role="grid"` without the keyboard model is strictly
worse than no role.

Known failure modes: interactive controls outside `role="cell"` become
unreachable; CSS-reordered content diverges from DOM order; wrapper elements
between row and cell corrupt the tree unless `role="presentation"`;
`aria-selected` on gridcells is high-risk (prefer a real checkbox inside the
cell for row selection). Add: `aria-sort` alone does not announce the result —
a polite live region ("sorted by Name, ascending, 1,240 rows") is required,
and filtering needs one too.

## Recommended architecture — (C), four strictly one-directional layers

- **L0 — Row model (zero DOM).** `(rows, state) → view rows`. Sort, filter,
  search, group, aggregate, expand, paginate. Pure functions + signal state
  slices, each feature independently importable. Every feature carries
  `mode: 'client' | 'server'` — a single global "server mode" flag is wrong,
  because real apps do server pagination with client column visibility.
- **L1 — Column model (zero DOM).** Defs, visibility, order, pinning, sizing.
  Deliberately separate from L0 — columns must change without recomputing
  rows. Collapsing these is what makes resize re-sort.
- **L2 — Interaction & a11y.** Roving focus, 2-D keyboard, selection sets,
  edit lifecycle, ARIA index arithmetic. **Wraps `@angular/aria` Grid.**
- **L3 — Rendering.** Virtualizer + `@for` templates + sticky. The only layer
  touching the DOM.

Owning L3 costs perhaps 2,000 lines and buys signal-native rendering plus
`@angular/aria` compatibility. Keep `@angular/cdk/overlay` for edit popovers
and column menus only.

**Required from day one: `rowId: (row, index) => string`.** It feeds `@for`
`track`, selection sets, expansion sets, edit buffers and `aria-rowindex`
simultaneously. `track $index` under sorting silently reuses the wrong DOM
node for the wrong row; `track row` re-creates everything when the server
returns fresh objects.

## Scope

**v1:** sort (single + multi), filter, global search, client + server
pagination; column visibility, order, sizing, pinning; the full
`@angular/aria` keyboard model **plus the three gaps — PageUp/PageDown, F2,
`aria-rowcount`/`aria-colcount`**; row selection with indeterminate state
driven off _filtered_ counts; `aria-sort` + live region; fixed-row-height
vertical virtualization; sticky header/footer/columns; loading/empty/error
slots.

**Deferred:** variable row heights, column virtualization, grouping and
aggregation, editable cells, cell-range selection, tree/master-detail,
column drag-reorder.

## Performance

Cost order: **DOM node count** (1,000 rows × 12 columns = 12,000 cells;
layout is superlinear in table layout) → **per-cell bindings** (4 bindings ×
12k cells = 48k checks) → **event listeners** (one delegated listener on the
grid root is mandatory) → change detection, which with OnPush + signals is no
longer dominant. Design goal: **one signal per cell value, no component
instance per cell.**

**No credible public benchmark for large Angular tables exists in 2026** —
everything found was vendor-authored. TEKAD should publish its own.

Targets to validate by prototype: ≤60 rows in DOM regardless of dataset;
1M rows client-side via an index array rather than materialised objects;
60 FPS scroll at ≤8 ms scripting/frame; first paint of 30×10 < 50 ms;
100k-row sort < 400 ms on the main thread.

## Prototype first — each is a kill-shot risk

1. **`@angular/aria` Grid + TEKAD's own `@for` rendering.** Prove `ngGridCell`
   registers correctly outside portals and #32603 does not recur. If this
   fails, L2 collapses and TEKAD owns the keyboard model — a 5× cost change.
2. **Sticky header over a transformed virtual viewport** — the containing-block
   trap. Prove horizontal sync and column measurement at 60 FPS.
3. **`Ctrl+End` into an unrendered row**, with a screen reader attached.
4. **100k rows × 20 columns**, sort + filter + scroll. Publish the numbers.
