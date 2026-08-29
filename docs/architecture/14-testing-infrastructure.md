# Testing Infrastructure (Phase 8)

Phase 8 wired up the unit-test runner ADR-011 chose, and then spent most of its
effort on a question the ADR did not ask: **how would we know if the tests
stopped testing anything?**

The answer turned out to matter more than the wiring. The first suite written
in this phase went green immediately, and nine of its eleven tests stayed green
when the behaviour they exist to protect was deleted.

## Three corrections to ADR-011

Recorded in full as a dated correction on the ADR. In brief:

**The executor is `@nx/angular:unit-test`, not `@angular/build:unit-test`.**
The latter refuses a `@nx/angular:package` build target outright — which is
every library in this repo. The former delegates to the same
`executeUnitTestBuilder` after patching the builder context, so Vitest and the
runner semantics ADR-011 decided are unchanged. Only the name in `project.json`
moves.

**The runner's DOM is jsdom, and it has none of the overlay's primitives.**
No `showPopover`, no `dialog.showModal`, no `inert`, no Web Animations, no
`matchMedia`. It does have `TransitionEvent`.

**A green suite was never the claim worth making.** See below.

## What the unit runner can and cannot host

`docs/architecture/12-overlay-foundation.md` promised the 33-assertion overlay
lifecycle proof would move into this phase's infrastructure "unchanged". It
cannot, and the reason is worth more than the promise was.

jsdom can carry the _event_ that ends a deferred close and none of the _state_
a deferred close exists to manage. A spec written here against a real
`HTMLElement` would be a test double wearing a real element's name — worse than
an honest double, because it would read as browser-backed evidence. The proof
stays in `tools/verify-overlay-lifecycle.test.mjs`.

That settles a division Phase 9 inherits:

|                                                                     | Where it runs                            |
| ------------------------------------------------------------------- | ---------------------------------------- |
| Logic, ordering, lifecycle, DOM structure                           | jsdom, via `nx test`                     |
| Top layer, focus, `inert`, animation, media queries, computed style | a real browser, via the Playwright gates |

`packages/overlay/src/lib/unit-test-dom.spec.ts` asserts each absence rather
than describing it in a comment. If a jsdom upgrade lands `showPopover`, that
spec fails, and the failure is the news: the double may be retirable. Same
arrangement as ADR-005's assumptions gate — a failure means a decision rests on
facts that have moved, not that something is broken.

## The finding: nine of eleven tests did not care

`TekadLiveAnnouncer` has one line that carries its central behaviour. A live
region only announces when its content **changes**, so announcing "3 results"
twice sets identical text and the second announcement is silently dropped. The
service clears the region, then sets the text in a later task, precisely to
guarantee the change.

Delete that and assign `textContent` directly. The suite:

- **9 tests still pass.** The region ends up with the right text; every test
  that checks the end state is satisfied.
- **2 tests fail.** The one that watches the region with a `MutationObserver`
  and requires it to have passed through empty, and the one that requires the
  clear to be synchronous while the set is not.

Both of those were written deliberately, because "the text is right" and "the
text was observed to change" are different claims and only the second is why
the code is shaped the way it is. But nothing in the toolchain knew that. Nine
tests looked exactly as authoritative as the two that mattered.

## The gate that came out of it

Every gate in `tools/` already ships with a self-test proving it fails when it
should — a discipline that caught seven real defects across Phases 0–7, three
of them in the first five gates written. Unit tests had no equivalent, and they
need one **more** than the gates do: a broken gate usually fails loudly on its
fixture, whereas a unit test that has stopped asserting anything simply stays
green forever.

`tools/verify-mutation.mjs` closes it. `tools/mutants.json` pairs each
plausible defect with the test that must catch it:

| Mutant                            | The mistake it stands in for                                       |
| --------------------------------- | ------------------------------------------------------------------ |
| `announcer/assign-directly`       | a repeated message becomes silent                                  |
| `announcer/eager-regions`         | regions built in the constructor — a hydration mismatch on SSR     |
| `announcer/leak-regions`          | teardown that empties but never removes                            |
| `announcer/no-server-guard`       | announcing where there is no DOM                                   |
| `announcer/clear-does-not-cancel` | a torn-down view's message read out anyway                         |
| `announcer/shared-region`         | one region with a flipped `aria-live`, which is unreliable         |
| `identity/non-unique`             | duplicate ids, which break every `aria-labelledby` pointing at one |

Seven mutants, all caught by the tests named for them.

### Why it demands a _named_ test

"The run went red" is not evidence. Three ways a mutation run looks successful
without being one, all rejected:

1. **The mutant survived** — everything passed, so nothing covers the
   behaviour.
2. **The mutant broke the build** — zero tests ran, so redness is guaranteed
   and meaningless. A mutant has to compile to be a plausible defect.
3. **The named test is gone** — someone renamed it, something unrelated failed
   instead, and the run is red for a reason nobody chose. This is the exact
   decay the gate exists to catch, so it is reported distinctly.

`tools/lib/mutation.test.mjs` asserts all three, against synthetic reports —
synthetic because the interesting cases cannot be produced from the real suite
without breaking it and leaving it broken.

### What it deliberately is not

Not a mutation-testing framework. No operator library, no generated mutants, no
score. Those produce hundreds of mostly-equivalent mutants and a percentage
nobody acts on. A hand-written manifest, where every entry is a defect a person
could plausibly write, clears CLAUDE.md rule 9 on both counts: a concrete
current use, and a measured benefit.

It is also the only tool in TEKAD that edits source files, so it restores in a
`finally`, on `SIGINT`/`SIGTERM`, and again on exit — then re-reads each file to
confirm the restore, and exits non-zero naming the file if it cannot. A silent
failure there would look like uncommitted work appearing from nowhere.

## A second silence, found while fixing the first

`@nx/angular:unit-test` resolves its `include` globs against the project's
**source root**. TEKAD's secondary entry points live outside `src` —
`packages/core/a11y/live-announcer/…` — so they need a `../` pattern to be
reached at all.

The obvious one, `../**/*.spec.ts`, was measured pulling _another package's_
specs into the build: `nx test button` tried to compile `packages/core`'s specs
and failed. `../a11y/**/*.spec.ts` does not.

That failure was loud, and therefore harmless. The same mistake in the other
direction — a new entry point that no glob happens to match — produces a green
run of a suite that never executed, and says nothing at all.

`tools/verify-test-discovery.mjs` asserts the equality: what the executor
discovers must be exactly the spec files on disk under that package, in both
directions. It gets the discovered set by asking (`nx test <p> --listTests`)
rather than re-implementing the glob semantics, because modelling the executor's
behaviour a second time is how the original mistake was made. A package with no
behaviour worth testing needs no test target — `@tekad/theme` is a constant and
a type — but spec files with no target at all are a failure, because someone
wrote those and nothing has ever run them.

## State at the end of Phase 8

|                              |                                           |
| ---------------------------- | ----------------------------------------- |
| Unit tests                   | 27, across `core`, `button` and `overlay` |
| Mutants, all caught          | 7                                         |
| Gate self-tests added        | 22 (12 mutation, 10 discovery)            |
| Packages with no test target | `theme` — a constant and a type           |

`packages/button/src/lib/tekad-button.spec.ts` is small but shows the intended
shape: the `type="button"` default is not asserted as an attribute, it is
asserted by putting the button in a `<form>`, clicking it, and requiring the
form not to submit — with a companion test proving the environment _does_
implement implicit submission, so a passing negative means something.

## What Phase 8 does not deliver, and why

ADR-011 also lists `size-limit` per-entry budgets, forced-colors visual
snapshots, an SSR/hydration test per package, and `axe` on every example. None
are built.

All four need components to measure, and there are none yet: `TekadButton` is a
packaging fixture and `@tekad/theme` is a stylesheet. Establishing a budget
against a fixture would set a baseline for something that is about to be
deleted. The two budgets that _could_ exist without components — the theme CSS
budget and the tree-shaking probe — are gates already, from Phases 4 and 2.

Phase 9 is the first phase with anything to measure, and it inherits these.

## Still unverified

Unchanged from Phase 7, and stated again because a testing phase is exactly
where it would be tempting to quietly imply otherwise:

- **No screen reader has been run.** Neither the unit tests nor the browser
  gates prove a user hears anything. What they prove is that the DOM presents
  the change a screen reader is specified to act on.
- **Firefox/Gecko, real Safari, mobile virtual keyboards** — UNVERIFIED.
- **`prefers-reduced-motion` in WebKit** — UNVERIFIED, and now known to be
  unreachable in the unit runner too, since jsdom has no `matchMedia`.
