# Overlay Foundation (Phase 6)

`@tekad/overlay` ships the deferred-close primitive that prototype P0 measured
and hardened. It is the one phase whose evidence was gathered before the code
was written.

## Why deferred close, and not the CSS `overlay` property

The research phase framed this as a go/no-go on the CSS `overlay` property, on
the grounds that it is unsupported in Firefox and Safari (73.5% global). P0
replaced that framing with something more decisive: **`overlay` is not
author-settable.** MDN is explicit that it "can only be set by the browser;
author styles cannot change it." It was therefore never a foundation, only one
optional entry in a transition list — support statistics were beside the point.

What P0 did measure is the consequence of getting the exit wrong. Using a pixel
oracle, in WebKit a closing element **keeps `display: block`, keeps its layout
box, and stays positioned against the viewport** — while from ~300 ms its pixels
paint _beneath_ a max-z-index cover. Top-layer paint priority is lost while
layout survives.

That detail is the reason this phase exists in the shape it does: a
computed-style check, a `getBoundingClientRect` check, or a DOM-presence check
would all have reported success. Three of the five failures observed during P0
turned out to be harness defects rather than browser behaviour, and the one that
mattered was only visible in rendered pixels.

**So the element is never closed while it animates.** It stays open — hence in
the top layer — for the whole exit, and JS closes it once the animation ends.

A hybrid was rejected: deferred close is a strict superset of the naive path's
measured behaviour, so native-where-supported would buy roughly 25 lines of JS
in Chromium at the price of two permanently divergent exit paths and two
accessibility timing models.

## The contract boundary is a promise, not an implementation detail

| Mode               | Ownership                  | Guarantee                           |
| ------------------ | -------------------------- | ----------------------------------- |
| `popover="manual"` | TEKAD owns dismissal       | Deferred visual exit **guaranteed** |
| `popover="auto"`   | Browser owns light-dismiss | Exit animation **not promised**     |

Verified identically in both engines: a genuine pointer light-dismiss removes
the element from the top layer **before** `toggle` reaches the controller. There
is no window in which a TEKAD-owned exit animation could run. The controller
reconciles the already-closed state instead of fighting it.

This is stated as a contract rather than hidden, because a component author who
chooses `auto` for its native stack semantics needs to know that the exit
animation goes with it.

## Accessibility is released at close _intent_

Because the element deliberately stays open and visible for the whole exit,
releasing ARIA and focus at animation end would leave assistive technology
describing an overlay the user has already dismissed — for the entire duration.
So `aria-expanded` and focus return fire at intent.

There are four layers here, and only the first three have been observed:

1. **Close intent** — ARIA and focus released ✓
2. **Visual exit** — animating, still open, still in the top layer ✓
3. **Actual close** — DOM and top-layer removal ✓
4. **Assistive-technology behaviour** — **UNVERIFIED**

No screen reader was run during P0 and none has been run since. No
screen-reader correctness is claimed anywhere in this package.

A generic `aria-hidden` rule was **removed** from the P0 candidate: it is a
no-op at best and an anti-pattern at worst, and was load-bearing for nothing.
Role-appropriate semantics — `aria-modal` plus background `inert` for a modal,
`aria-expanded`/`aria-controls` on the trigger for a popup — belong to the
concrete component, not to a rule invented by the primitive.

## One change from the P0 candidate

The prototype accumulated a `stats` object of sixteen counters plus two growing
event arrays on every instance. That was harness scaffolding, and shipping it
would mean every overlay in every application allocating and growing arrays for
observations nobody reads.

It is replaced by an optional **diagnostics sink**: a callback the tests attach
and production omits. Same observability, zero cost when unused.

## The proof, and why the control matters more than the test

`tools/verify-overlay-lifecycle.test.mjs` — 33 assertions against the **built**
package, because a partial-compiled FESM is what a consumer receives.

**EVIDENCE CLASS: DEFENSIVE / SIMULATED.** Neither Chromium nor WebKitGTK was
observed delivering `toggle` synchronously, so no browser run proves the
re-entrancy invariant. It is proved at the injectable `closeOp` seam instead.
P0 explicitly rejected monkey-patching `hidePopover` to force a real browser to
dispatch synchronously — forcing an engine to behave in a way it does not is not
evidence, it is a different experiment.

The control is the part that gives the test meaning. A state machine that never
re-enters at all would pass every assertion, so a replica of the **pre-fix**
ordering — close call before terminal state — must be shown to break. It does,
and more dramatically than P0 recorded:

> Running the replica uncapped crashes with `RangeError: Maximum call stack size
exceeded`. Because the state is never terminal when the nested handler checks
> it, the guard never engages and the transition re-enters **without bound**.

P0 described this as "a synchronous `toggle` could re-enter cleanup". The actual
failure mode is unbounded recursion, not one extra pass. The test caps the depth
purely so it can observe the recursion instead of dying of it.

The other 30 assertions cover the rest of the §H5 contract: exit duration parsed
from computed style across eight cases including `all`, delays, second units and
list-length mismatch; zero duration closing immediately rather than awaiting a
`transitionend` that never fires; stale completions unable to close a reopened
overlay; transition events filtered by **both** `propertyName` and `target`;
listener balance that does not grow with cycle count; and browser dismissal
reconciled with nothing left pending.

One of those found a defect in the **test** rather than the code: the first
listener-balance assertion failed at 3 vs 1 because it measured mid-close, when
two transition listeners are legitimately outstanding. The corrected assertion
is stronger — it checks that the count does not grow with the number of cycles,
which is what a leak would actually look like.

## What is deliberately not built yet

ADR-010 describes more than this: Floating UI positioning, a dismissal
dispatcher for nested portalled submenus, scroll strategies, and a focus trap.
None of it is here, and one of those may never be needed.

**Focus trapping is mostly already solved by the platform.** ADR-010 notes that
`<dialog>.showModal()` grants `inert`, `aria-modal`, Escape and focus restore
for free, at 96.1% support. Non-modal popovers should not trap focus at all. So
the bespoke focus trap is needed only on the `position: fixed` fallback path —
a much narrower requirement than "TEKAD owns focus trapping" suggests, and one
worth confirming against a real fallback before building for it.

**Positioning waits for a component that needs positioning.** Floating UI is
6.4 KB gzip against ADR-010's 10 KB budget for foundation plus positioning; the
budget is measurable the moment there is something to measure. Building the
integration now would mean designing the placement API — logical
(`block-start`, `inline-end`) per ADR-010 — against no call site.

**The dismissal dispatcher waits for nesting.** It exists for nested portalled
submenus and tooltips. There are none.

Two sequencing constraints from ADR-010 are permanent and will shape all of the
above when it is built: `showModal()` force-closes `auto` popovers, and
`showPopover()` throws `InvalidStateError` if called re-entrantly from
`beforetoggle`.

## Still tracked, still not assumed

Firefox/Gecko for the whole matrix · real Safari on macOS and iOS · screen
readers · `prefers-reduced-motion` in WebKit · synchronous `toggle` delivery ·
mobile virtual keyboard · `showModal()` force-closing `auto` popovers.

What needs cross-engine verification is the **substrate** —
`popover` / `<dialog>` / `inert` — not `overlay`, which the chosen strategy does
not depend on at all. That is precisely why P0 could lock the architecture
despite Gecko being unverified: it _would_ have blocked the native-only and
hybrid options.
