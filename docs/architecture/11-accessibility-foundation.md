# Accessibility Foundation (Phase 5)

The roadmap said this phase would be thin if `@angular/aria` was adopted:
"TEKAD builds only the gaps." It is thin. One service, one lint rule, and a gate
that re-checks whether the gaps are still gaps.

## The assumptions were re-verified before anything was built

ADR-005 decided two large things — that TEKAD owns the entire floating layer
(ADR-010), and that TEKAD must build its own live announcer — on the strength of
two facts about `@angular/aria`. Both were true when the research ran. Neither
is guaranteed to stay true, and both could change in a **patch** release.

So they were re-checked against the installed 22.1.4 before a line was written:

| ADR-005 claim                                    | Status                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| Peer-pins `@angular/cdk` at an **exact** version | ✓ `"@angular/cdk": "22.1.4"` — exact, not a range                   |
| Ships no live announcer                          | ✓ zero matches for `aria-live` / `LiveAnnouncer`                    |
| Ships no focus trap                              | ✓ zero matches                                                      |
| No dialog, popover or backdrop                   | ✓ zero matches                                                      |
| No element measurement                           | ✓ zero `getBoundingClientRect` / `offsetWidth` / `getComputedStyle` |
| "One incidental `compareDocumentPosition`"       | ✓ exactly one                                                       |

Two things the original grep did not record, now pinned:

- **`scrollIntoView` ×3.** Aria scrolls the active list item into view. That is
  scrolling, not floating-layer positioning — the claim survives, but the
  record is now precise about it.
- **`inert` ×6.** Aria binds `inert` on its **own** hidden accordion and tab
  panels, and on hard-disabled toolbar widgets. That is hiding non-visible
  content from the tab order, not a focus trap, and it is not a utility TEKAD
  can reuse.

`tools/verify-aria-assumptions.mjs` runs all of this on every CI build. **A
failure there is not a bug.** It means a decision was made on facts that have
moved. The message says which ADR to reread, and in which direction:

> If Aria gains a live announcer, TEKAD should **delete** its own rather than
> maintain a duplicate — KEEP before BUILD, and a silently diverging second
> implementation is the worst of both.

## The gap TEKAD owns: a live announcer

`@tekad/core/a11y/live-announcer`. Its own secondary entry point, so an
application that never announces anything never pays for it.

It is deliberately the smallest thing that works, because live regions are
unusually easy to get subtly wrong and each extra feature is another way to be
wrong. Four decisions carry the correctness:

**The region is created lazily, in the browser only.** Not at import time and
not in a constructor that might run on a server. SSR has no DOM; touching
`document` at module scope breaks the server render, and creating the region
during hydration produces a node the server never emitted — a hydration
mismatch.

**A message is cleared before it is set.** A live region only fires on a
_change_. Announcing "3 results", filtering, then announcing "3 results" again
sets identical text, so the second announcement is silently dropped and the user
is told nothing. Clearing first guarantees a change the screen reader observes.

**Two regions, one per politeness.** `aria-live` politeness is read when the
region is first encountered, so flipping the attribute on one shared region is
unreliable across implementations.

**Visually hidden by clipping, never by `display:none`.** `display:none`,
`visibility:hidden`, the `hidden` attribute and `aria-hidden` each remove the
element from the accessibility tree entirely — which is the single most common
way a live region ends up announcing nothing at all.

## Verified behaviourally, in a real browser

CLAUDE.md's Definition of Done requires accessibility "verified behaviourally
(not by attribute-counting)". Not one of the claims above can be established by
reading the source, so `tools/verify-live-announcer.mjs` drives a real Chromium
and asserts 15 properties, including:

```
✓ no live region exists before the first announcement
✓ the region is NOT display:none (that would silence it)
✓ the region still occupies layout, so it stays in the a11y tree
    observed content sequence: ["","three results"]
✓ re-announcing the same text produces an observable change
✓ destroying the injector removes both regions
```

That `["", "three results"]` sequence is the clear-then-set actually happening,
observed through a `MutationObserver` rather than inferred.

**What this does not prove: that a screen reader speaks.** Nothing short of
NVDA, JAWS or VoiceOver proves that, and no screen reader has been run at any
point in this project. What is verified is that the DOM contract those tools
rely on is correct. That distinction is recorded rather than blurred — the same
discipline P0 applied to Firefox.

This driver is a stopgap. ADR-011 chose Vitest and Phase 8 builds the testing
infrastructure; these assertions move into it unchanged.

## `@angular/aria/private` is banned by lint

ADR-005: "Never build on `@angular/aria/private` — it carries no compatibility
guarantee." It is a real published entry point, so importing it works and
nothing else complains; the cost lands later, when it changes in a patch release
and TEKAD has shipped a dependency on Angular's internals to every consumer.

Now an ESLint `no-restricted-imports` rule, with two self-test cases: the
private import must be reported, and a **public** Aria entry point must not be.

## A promise from Phase 2, kept

Phase 2 recorded that the things which actually defeat tree-shaking — DI tokens
evaluated at import time, module-level side effects, `providedIn: 'root'`
services — did not exist in the repo yet, and that the probe must grow a
scenario when the first one appeared.

The announcer is the first. Two scenarios were added:

| Scenario                                        | Result                       |
| ----------------------------------------------- | ---------------------------- |
| An app that imports only the identity primitive | the announcer is **absent**  |
| The same app that injects the announcer         | the announcer is **present** |

`providedIn: 'root'` is tree-shakable _by design_ — the injector reference is
what retains it. But that is a property of how the service is written, not a
guarantee of the decorator: an `APP_INITIALIZER`, a module-level `inject()`, or
anything that registers itself on import defeats it. Which is why it is measured
rather than assumed.

## A peer dependency came back, for the right reason

Phase 2 removed `@angular/core` from `@tekad/core`'s peers because nothing
imported it, and `@nx/dependency-checks` was right to flag it. The announcer
uses Angular DI, so it is back — declared because it is _used_, which is the
only reason a peer should ever be declared.

## Not built

- **Focus trap.** Genuinely absent from Aria, and genuinely needed — but P0
  settled that the overlay substrate is native `inert` plus the top layer, so it
  belongs to Phase 6 with the rest of the floating layer rather than here.
- **Directionality.** CDK ships it and CDK is already a peer via Aria's exact
  pin. KEEP before BUILD.
- **Everything Aria already does.** Roving tabindex, `aria-activedescendant`,
  typeahead, list navigation: twelve patterns over nine entry points, on the
  framework's own release cadence. ADR-005 calls this "the largest single
  reduction in code TEKAD must own and test", and Phase 5 spending one service
  is what that reduction looks like in practice.
