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

## 2026-08-29 — correction: the executor is `@nx/angular:unit-test`, and the runner has no DOM to speak of

**The decision above is unchanged.** Vitest is the runner. Two of the
mechanical claims around it are wrong, and one consequence needs stating that
was not foreseen — so this is a dated correction rather than a superseding ADR.

### 1. `@angular/build:unit-test` cannot run this workspace's libraries

This ADR names it directly. It refuses a TEKAD package:

```
The 'buildTarget' is configured to use '@nx/angular:package',
which is not supported.
```

Every TEKAD library builds with `@nx/angular:package` (ng-packagr, Angular
Package Format, partial compilation — ADR-003), so this is not a corner case,
it is every package in the repo.

**`@nx/angular:unit-test` works**, and works by delegating: it calls
`patchBuilderContext(builderContext, buildTarget)` and then runs the very same
`executeUnitTestBuilder` from `@angular/build`. So Vitest, `@angular/build`'s
test pipeline, and the runner semantics this ADR chose are all exactly what was
decided. Only the executor name in the `project.json` changes.

One configuration detail is worth writing down because it is silent when wrong:
the executor's `include` globs resolve against the project's **source root**,
not its root. Secondary entry points live outside `src` — `packages/core/a11y/…`
— so they need an explicit `../a11y/**/*.spec.ts`. The obvious `../**/*.spec.ts`
was measured pulling _another package's_ specs into the build. `nx test button`
tried to compile `packages/core`'s specs and failed.

That failure was loud. The same mistake in the other direction — an entry point
no glob happens to match — is silent, and produces a green run of a suite that
never executed. `tools/verify-test-discovery.mjs` now asserts the equality by
asking the executor what it discovered (`--listTests`) rather than modelling
the glob semantics a second time.

### 2. The unit-test DOM is jsdom, and it has none of the overlay primitives

Not anticipated here, and it changes what "move the overlay proof into Phase
8's infrastructure" can mean. Measured in the runner
(`packages/overlay/src/lib/unit-test-dom.spec.ts`, which asserts each of these
so a future upgrade fails the build and says so):

|                                     |                                                          |
| ----------------------------------- | -------------------------------------------------------- |
| `showPopover` / `popover` attribute | **absent** — no top layer at all                         |
| `dialog.showModal`                  | **absent**                                               |
| `inert`                             | **absent**                                               |
| `element.animate` / `getAnimations` | **absent**                                               |
| `matchMedia`                        | **absent** — `prefers-reduced-motion` cannot be honoured |
| `TransitionEvent`                   | **present**                                              |

`docs/architecture/12-overlay-foundation.md` promised the 33-assertion overlay
lifecycle proof would move here "unchanged". It cannot. jsdom can carry the
_event_ that ends a deferred close and none of the _state_ a deferred close
exists to manage, so a spec written against a real element here would be a
double wearing a real element's name — worse than an honest double, because it
would read as browser-backed. The proof stays in
`tools/verify-overlay-lifecycle.test.mjs`, and its reason is now stronger than
"the invariant is about ordering in one synchronous stack": the unit runner has
nothing to offer it.

The division this settles, and which Phase 9 inherits: **logic in jsdom, the
platform in a real browser.** Anything touching the top layer, focus, `inert`,
animation or media queries is a Playwright gate. That is where those
obligations already were; this records that it is a constraint rather than a
preference.

### 3. A green suite was never the claim worth making

Also not foreseen here, and the most consequential of the three.

The live-announcer suite went green on its first run. Deleting the single line
that makes a repeated announcement audible — clearing the region before setting
it — left **nine of its eleven tests still passing**. Only two caught it.

Every gate in `tools/` already ships with a self-test proving it fails when it
should; three of the first five gates were vacuous or wrong on first
implementation and only the self-tests found it. Unit tests had no equivalent,
and they need one more: a broken gate usually fails loudly on its fixture,
whereas a unit test that has stopped asserting anything simply stays green.

`tools/verify-mutation.mjs` closes that. `tools/mutants.json` pairs each
plausible defect with the test that must catch it; the gate applies it, runs
the suite, and requires **that named test** to fail. Seven mutants, all caught.

Requiring a _named_ test rather than "the run went red" is the substance of it.
A mutant that fails to compile fails everything, which satisfies a laxer check
while proving nothing; and if the test doing the catching is renamed away, the
run is still red for a reason nobody chose. Both are rejected, and the gate's
own self-test (`tools/lib/mutation.test.mjs`) asserts all three failure shapes.

This is deliberately **not** a mutation-testing framework — no operator library,
no generated mutants, no score. Those produce hundreds of mostly-equivalent
mutants and a percentage nobody acts on. A hand-written manifest where each
entry is a defect someone could plausibly write clears CLAUDE.md rule 9 on both
counts: concrete current use, measured benefit.

### Still outstanding from this ADR

Forced-colors snapshots, the SSR/hydration test per package, and `axe` on every
example are **not** built. They need components to measure, and Phase 9 is the
first phase that has any. The theme CSS budget and the tree-shaking probe — the
two budgets that could exist without components — are gates already; per-entry
size budgets were built on 2026-09-19, in the shape the correction below
describes.

## 2026-09-19 — correction: per-entry budgets are measured on the packed tarball, without `size-limit`

**The decision to have a hard, committed, per-entry byte budget is unchanged.**
What changed is the instrument, and this is recorded rather than quietly
substituted because the ADR above names a specific dependency.

`size-limit` 13.x with `@size-limit/esbuild` measures a **bundle**: it runs the
entry point through esbuild with a synthetic import and reports what that
produces. That is a proxy with two properties this project does not want. It
adds a dependency whose numbers describe a bundler's behaviour, and the bundler
is not the thing under test — the consumer's bundler is, and no two consumers
share one. It also measures a _re-bundle_, so the number moves when esbuild
changes rather than when TEKAD does.

What CI measures instead, in `tools/verify-size-budget.mjs`:

- the **packed tarball's** own bytes — the download, end to end, including
  whatever the packer decided to ship;
- **raw, gzip 9 and brotli 11** of each entry point's shipped `.mjs`, straight
  out of that tarball, with the compression levels pinned so a budget measured
  at one level is never checked at another;
- a **2% tolerance**, a failure when a package or entry point has no committed
  budget, a failure when a budget stops being measured, and a note when a size
  _shrinks_ so the committed number can be lowered.

The instrument is `tools/lib/tarball.mjs`, shared with gate 9b, so the file
list, the manifest and the measured bytes are the same bytes the consumer
boundary is verified against. It has no dependencies: a package that reads
tarballs in order to prove what TEKAD depends on should not add a dependency to
do it. Its reader refuses anything npm does not write (a symlink, an unknown
header type, a checksum that does not match) rather than skipping it, because a
skipped entry is a shipped file the gates never see.

What is lost: `size-limit`'s synthetic bundle figure and its PR comment. The
first is a different measurement of a different artefact, and the second is
output, not proof. What is kept is the thing the ADR was protecting — a number
that fails the build when it grows.
