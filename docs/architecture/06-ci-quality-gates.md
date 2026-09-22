# CI Quality Gates

`main` is never knowingly broken.

## Required gates

| #   | Gate                                                                                                                                                                             | Blocking                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | Install from committed lockfile                                                                                                                                                  | yes                                         |
| 2   | Format check                                                                                                                                                                     | yes                                         |
| 3   | Lint                                                                                                                                                                             | yes                                         |
| 4   | Typecheck                                                                                                                                                                        | yes                                         |
| 5   | Unit + component tests                                                                                                                                                           | yes                                         |
| 6   | Accessibility tests                                                                                                                                                              | yes                                         |
| 7   | SSR / hydration tests                                                                                                                                                            | yes                                         |
| 8   | Package builds (every entry point)                                                                                                                                               | yes                                         |
| 9   | Package validation — exports, types, ESM, `sideEffects`, no internal leakage                                                                                                     | yes                                         |
| 9b  | **Packed-tarball consumer boundary** — every shipped file reachable, every public specifier resolves, every internal one refused, declarations type-check, no phantom dependency | yes                                         |
| 10  | Dependency-boundary check — no cycles, no upward deps, charts not reachable from core                                                                                            | yes                                         |
| 11  | Tree-shaking probe — single-import app contains no unrelated TEKAD code                                                                                                          | yes                                         |
| 12  | Dependency vulnerability audit                                                                                                                                                   | yes                                         |
| 13  | License audit of the dependency tree                                                                                                                                             | yes                                         |
| 14  | Bundle-size budgets — per entry point, measured on the packed tarball                                                                                                            | yes; baselines committed 2026-09-19         |
| 15  | Performance benchmarks                                                                                                                                                           | report first; blocking once baselines exist |
| 16  | Documentation build                                                                                                                                                              | yes                                         |

## Why 9 and 14 have a second instalment

Every gate above that inspects build output inspects `dist/`, and `dist/`
is not what a consumer receives. Between the two sit `.npmignore`, the `files`
field, and the `exports` map — which is the only thing that decides whether a
shipped file can be imported at all. On 2026-09-19 the difference was measured:
`@tekad/theme` shipped `styles/tekad.css`, the file that package exists to
provide, and its own `exports` map refused every import of it. Nothing that
looked at `dist/` could have found that, because nothing that looked at `dist/`
looked at the tarball from the outside.

Gate 9b therefore packs each built package with the real `npm pack`, extracts
the tarballs into a scratch consumer's `node_modules`, and asserts from there:

- every file in the tarball is named by an `exports` subpath (or is a
  sourcemap, or `package.json` itself) — the check that caught the theme;
- every public specifier **resolves and imports** from the scratch consumer,
  with no path mappings and no workspace links to `@tekad/*`;
- every internal specifier is **refused**: `…/src/index.ts`, a raw
  `fesm2022/*.mjs`, and a subpath that does not exist;
- the shipped `.d.ts` files type-check against a consumer that imports them;
- every bare import in the shipped code is declared as a dependency or peer,
  and every declared runtime dependency is either imported or is `tslib`
  (which ng-packagr injects from `@angular/compiler` and no package imports);
- no lifecycle script, `type: module`, `sideEffects: false`, and `private`
  reported rather than asserted — see ADR-016 for why the last one is a note.

Gate 14 reads its numbers from the same packed tarballs: the tarball's own
bytes, plus raw/gzip/brotli for each entry point's shipped file, compared
against `tools/size-budget.json` at a 2% tolerance. A package or entry point
with no committed budget fails, and so does a budget with no measurement — a
budget that stops being measured is a number nobody is holding.

## Proof of failure

Every gate in `tools/` ships a self-test (`*.test.mjs`) that proves it fails
when it should, and `pnpm run verify:gates` runs all of them before the gates
themselves. Three of the first five gates were wrong or vacuous on their first
implementation and only the self-test revealed it, so this is not ceremony: it
is the difference between a gate and a green light.

The self-tests are not the same thing as mutants. A mutant
(`tools/mutants.json`, run by `tools/verify-mutation.mjs`) proves that a
**library behaviour** is genuinely covered by a unit test — it edits source,
runs the project's suite, and requires the _named_ test to fail. A gate is not
covered by a unit test; it is covered by its own self-test, which drives the
real gate against a synthetic input and asserts which check fires. Both exist,
and neither substitutes for the other.

## The two things a fresh checkout gets wrong

Both were found by the first run of CI on the first pull request (`#1`), and
both had the same shape: a gate that reports success while evaluating nothing.

1. **`@nx/enforce-module-boundaries` skips when no project graph is cached.**
   It prints `No cached ProjectGraph is available. The rule will be skipped.`,
   exits 0, and every boundary assertion passes because none was evaluated. On
   a clean checkout — CI's first step, or a developer's first `pnpm run lint` —
   there is no graph. `tools/ensure-project-graph.mjs` now runs first in
   `pnpm run lint`, and the boundary self-test warms the graph itself and fails
   with a named message if the rule is ever skipped again.
2. **`nrwl/nx-set-shas` needs `actions: read`, which `permissions: contents: read`
   takes away.** GitHub's rule is that naming any scope in a `permissions:` block
   sets every unnamed scope to `none`. The action resolves its base two ways: on
   a `pull_request` it runs `git merge-base` and needs nothing, but on a **push**
   — the event this workflow listens for on `main` — it asks the API for the
   last successful run of the workflow on the default branch. Without the scope
   that request is refused, the action calls `setFailed`, and the job dies in
   under a second, before a gate runs. Verified against the action's source and
   the step's own timing (started and completed in the same second).
   `actions: read` is now granted on the `verify` job, read-only, and the step
   is given `fallback-sha: github.event.before` so the no-previous-success case
   uses the pre-push tip instead of `origin/main~1` — which, for a push carrying
   several commits, tests only the last of them and says so in a warning nobody
   reads.

   The reason this was not caught earlier is worth stating: **no CI step past
   `Install` had ever executed on `main`.** The one previous run on `main` had
   failed at `Install (frozen lockfile)`, so the push path of that action had
   never run. A branch that has never been green has never run most of its own
   CI.

3. **Playwright's browser is never downloaded.** pnpm blocks install scripts by
   default, and the browser download is one of them, so the behavioural gates
   had nothing to drive. The workflow now installs Chromium explicitly before
   the browser gates, which is also the honest place to pay that cost — it is a
   CI step, not a hidden postinstall.

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
