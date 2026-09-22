# SSR / Hydration Strategy

Research date 2026-08-26. Sources: angular.dev hydration, incremental
hydration, `afterRenderEffect` API docs.

## Verified platform facts

- **Incremental hydration is enabled by default in v22** whenever
  `provideClientHydration()` is used, and it **automatically enables event
  replay** — `withEventReplay()` can be dropped. Opt out with
  `withNoIncrementalHydration()`.
- Hydrate triggers: `idle | viewport | interaction | hover | immediate | timer`,
  plus `hydrate when <expr>` and `hydrate never`.
- `afterRenderEffect` / `afterNextRender` phases run in fixed order:
  `earlyRead` → `write` → `mixedReadWrite` → `read`. Angular recommends
  `read`/`write` and discourages the other two.
- **"afterRenderEffects run on browser platforms only, they will not run on
  the server."**
- **"Components are not guaranteed to be hydrated before the callback runs."**
- The app must reach stability within **10 seconds**; pending promises, timers
  and intervals block hydration. `provideStabilityDebugging()` diagnoses it.
- i18n blocks are skipped unless `withI18nSupport()`.

## Mismatch sources a library must avoid

Direct DOM manipulation (`document` queries, `appendChild`, `innerHTML`, node
moving) produces mismatches. Invalid HTML is a top cause — always declare
`<tbody>` explicitly, never `<div>` inside `<p>`, never nested `<a>` — because
browser auto-correction changes the DOM out from under hydration.

## TEKAD invariants

1. No module-level or constructor-level access to `window`, `document`,
   `localStorage`, `matchMedia`, `ResizeObserver`, `IntersectionObserver`.
   Inject `DOCUMENT`; put browser globals behind DI tokens. Enforce with lint.
2. IDs come from an injector-scoped deterministic generator — never
   `Math.random()` or `Date.now()` — or `aria-controls` / `aria-labelledby`
   will mismatch. (`@angular/aria` already does this via CDK's `_IdGenerator`.)
3. All `getBoundingClientRect()` reads go in a `read`/`earlyRead` phase; all
   style writes in `write`. One-shot open-time positioning uses
   `afterNextRender`.
4. **Because callbacks can fire before hydration completes, the first
   positioned frame must be visually safe** — render measured surfaces
   `visibility: hidden` (or opacity 0) until the first read→write cycle
   completes, to avoid a flash at (0,0).
5. Never server-render an _open_ overlay whose position depends on
   measurement. Render closed on the server; open after hydration.
6. Prefer keeping overlay nodes in their DOM position (native top layer) over
   moving them to a detached container — a DOM move is something Angular
   cannot reconcile.
7. `ngSkipHydration` is a temporary escape hatch that forfeits the performance
   win. Using it requires an ADR.

## Test requirement

Every package carries an SSR render test and a hydration-mismatch test. This is
CI gate 7, blocking.
