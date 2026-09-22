# Current task — Phase 9 remainder, then Phase 10

Phases 0–9 are complete in substance. Phase 9's record is
`docs/architecture/16-first-slice.md`, preceded by
`docs/architecture/15-ssr-encapsulation.md`; the phase-by-phase state is in
`.ai/state.json`.

## What Phase 9 delivered

Nine packages: `core`, `theme`, `overlay`, `button`, `checkbox`, `input`,
`form-field`, `forms` (with `compat`), `dialog`. 102 unit tests, 28 mutants,
four browser gates, 22 CI gates.

Four foundation problems surfaced, none of which a unit suite could have found.
They are worth reading before writing another component, because each is a rule:

1. **A component decorating an element the consumer wrote must style it with
   `:host`.** Angular rewrites `.tk-button` to `.tk-button[_ngcontent-…]`, an
   attribute stamped on elements _inside_ a template; the host carries
   `_nghost-…`. Not one rule matched, the unit suite was green, and the button
   was 21px tall in the user agent's default grey.

2. **Projected content cannot be styled from the component it is projected
   into.** It carries the scoping attribute of the component that _declared_ it.
   The field's error text was not red and nothing said so. The rule: a component
   styles its own host and its own template, and nothing else.

3. **A foundation package's spec must not reach for a component.** The boundary
   rule refused it and was right — an adapter that must work with any control
   had a suite encoding one component's behaviour as correct.

4. **`@layer` had never been tested** despite being load-bearing since Phase 4.

## What Phase 9 still owes

- ~~**`size-limit` per-entry budgets** (ADR-011).~~ **Landed 2026-09-19**, with
  the instrument changed and the change recorded in ADR-011: TEKAD budgets the
  **packed tarball** and each entry point's shipped bytes rather than a
  synthetic esbuild bundle. `source-map-explorer` and `bundlesize` remain
  unmaintained and are still never CI gates.
- **`axe` on every example**, and **forced-colors visual snapshots**. The
  forced-colors _behaviour_ is asserted for every component built; the snapshots
  are not.
- **An SSR/hydration test per package.** The SSR probe measures encapsulation
  cost, which is not the same as proving these components hydrate.
- **Select**, which needs positioning. Phase 6 deferred Floating UI until a
  component demanded it; this is the first that does, so the decision is now
  real rather than speculative — 6.4 KB gzip against ADR-010's 10 KB budget.
- **The table foundation**, carrying ADR-014's constraint from Phase 9's own
  measurement: **a cell is not a component**.
- **The `position: fixed` overlay fallback.** ADR-010's correction is explicit
  that it says nothing about that path, and it is where a bespoke focus trap may
  still be needed.

## Older debts, still open

- ~~**A TEKAD secondary-entry-point generator** (Spike B).~~ **Landed
  2026-09-19** as `tools/generate-entry-point.mjs`: `ng-package.json`,
  `src/index.ts`, the `tsconfig.base.json` path mapping and the package's test
  `include` glob, proved by regenerating all five committed entry points
  byte-identically, and refusing to overwrite.
- ~~**The packed-tarball import probe** (ADR-012's fourth boundary layer).~~
  **Landed 2026-09-19** as `tools/verify-consumer-boundary.mjs` (gate 9b). It
  found `@tekad/theme` shipping `styles/tekad.css` with its own `exports` map
  refusing every import of it — the file the package exists to provide.
- **A tree-shaking scenario per hazard.** Nine scenarios cover the current
  graph. Every new DI token evaluated at import time, module-level side effect,
  or `providedIn: 'root'` service needs its own, with a positive control.

## What landed on 2026-09-19 (packaging proof)

CI is **green** on the pull request (run 35431149451, 2026-09-19): Verify 11m14s
across all 24 steps — including the three behavioural gates on a real Chromium,
which had never had a browser installed in CI — and Supply chain 36s. The first
CI run found three defects of one kind, each a gate reporting success while
evaluating nothing: the boundary rule skipping without a cached project graph,
`smol-toml@1.6.1` exact-pinned past a patched advisory by nx, and the missing
Playwright browser. All three are fixed and recorded in `.ai/decisions.md`.

- `tools/lib/tarball.mjs` — a zero-dependency `npm pack` wrapper and a narrow
  ustar reader. The reader asserts its file list against npm's own report,
  because a reader that silently skips an entry makes every check above it
  vacuous. Unknown entry types throw rather than being ignored.
- `tools/verify-consumer-boundary.mjs` — gate 9b, `pnpm run verify:consumer`.
- `tools/verify-size-budget.mjs` + `tools/size-budget.json` — gate 14's second
  instalment, `pnpm run verify:size`. Baselines measured 2026-09-19 on the
  packed tarballs at Angular 22.1.4; 2% tolerance.
- `tools/generate-entry-point.mjs` — `pnpm run generate:entry-point`.
- `packages/core/project.json` gained `../forms/**/*.spec.ts`: the `forms/*`
  entry points existed while no glob matched their specs, which is a green run
  of a suite that never executed.
- `packages/theme/package.json` declares `./styles/tekad.css` and
  `./tokens.json` as exports; `verify-package-format.mjs` no longer requires a
  `types` condition on a non-script artefact, with self-test cases both ways.

## How components are expected to be written here

- Build on the native element. `<button tkButton>`, `input[tkInput]`, a real
  `<input type="checkbox">` inside the checkbox, a real `<dialog>`. Forced
  colours map by element semantics; the platform's keyboard behaviour, form
  participation and focus handling are already correct; and `showModal()` alone
  supplies the focus trap, inertness, `aria-modal`, Escape and focus restore
  that ADR-010 expected TEKAD to build.
- **Assert behaviour, not attributes.** The type default is tested by putting a
  button in a form and requiring it not to submit. Every IDREF is tested by
  _resolving_ it — an attribute holding a plausible id that nothing points at
  passes an existence check and is exactly the failure being guarded against.
- **Logic in jsdom, the platform in a real browser.** jsdom has no layout, no
  top layer, no `inert`, no animations and no `matchMedia`.
- **Every piece of load-bearing behaviour gets a mutant** in
  `tools/mutants.json`. Removing a mutant because it fails is how the gate stops
  meaning anything; fix the test. Removing one because the code it targets is
  gone is different, and `$removed` records why.
- Accessibility is verified behaviourally, never by attribute-counting.

## Publish gate — independent of all the above

Nothing is published until ADR-016's gates pass: npm scope availability,
placeholder registration **before the name is announced publicly**, and
professional trademark clearance for India, Indonesia and Malaysia. `LICENSE`
stays uncommitted and every package keeps `private: true` until then.

## Local setup still owed

`node_modules` was never written over the device bridge. Run `corepack enable
pnpm && pnpm install`; the lockfile is committed and CI installs frozen.
`_to_delete/` can be removed by hand — the bridge cannot unlink files, and git
leaves lock files there on every commit.

## Tracked, not blocking

Firefox/Gecko and real Safari — **every browser number in this project is
Chromium**. **No screen reader has been run at any point**; what is proved is
that the DOM presents what assistive technology is specified to act on.
`prefers-reduced-motion` in WebKit. Parse cost, measured and too noisy to
conclude anything. The Angular Language Service template path (Spike A Q2).
