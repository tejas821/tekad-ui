# P0 — Overlay exit-lifecycle prototype

**Gate for ADR-010.** Run 2026-08-27. Raw data: `p0-results.json`.
Harness: `harness3.html`. Runner: `run3.mjs`. Screenshots: `shots/`.

Everything below separates **observed behaviour**, **interpretation**,
**engine limitation** and **architectural implication**. Chromium, WebKit and
Gecko evidence are kept strictly apart. **No Firefox behaviour is inferred
from WebKit anywhere in this document.**

---

## 1. Test matrix

| Axis | Values |
|---|---|
| Overlay kind | `[popover]` (manual), `<dialog>.showModal()` |
| Exit strategy | **naive** (close immediately, rely on CSS `overlay` + `allow-discrete`) · **deferred** (element stays open; JS closes it only after the animation ends) |
| Ancestor | none · `transform` · `overflow:hidden` · `overflow:clip` · `opacity:.99` · `filter` · `contain:paint` · `will-change` · `transform+overflow:hidden+filter` |
| Position | viewport centre · flush to viewport right edge |
| Nesting | outer popover → inner popover → close inner → close outer |
| Lifecycle phase | opening · fully open · exit t≈60ms · ≈250ms · ≈550ms · ≈950ms · ≈1100ms (final frame) · post-close |

Exit transition 1200 ms. 5 samples per exit, judged only when the page-side
clock confirms the sample fell inside the transition window.

## 2. Ground truth — how "in the top layer" was measured

Four independent signals were recorded at every sample, deliberately
distinguishing **CSS declaration → browser state → layout → rendered pixels**:

1. **Rendered pixels (primary oracle).** An opaque cover fills the viewport at
   `z-index: 2147483647`. Only genuine top-layer content can paint above it.
   The driver screenshots and reads the pixel where the overlay should be.
2. **Layout geometry.** `getBoundingClientRect()`. In the top layer the
   containing block is the viewport; when demoted it becomes the transformed
   ancestor and the box reflows/clips.
3. **Browser state.** Computed `overlay` (`auto`/`none`/unsupported) and
   computed `display`.
4. **True elapsed time** from a page-side `performance.now()` clock.

No single signal was treated as ground truth — and that mattered (§5).

## 3. Actual observations

### Chromium (Playwright build 1194, headless, `HeadlessChrome/141.0.0.0`)
Capabilities: `popover` ✓ · `showModal` ✓ · **`overlay` ✓** ·
`transition-behavior: allow-discrete` ✓ · `@starting-style` ✓ · `inert` ✓

| Scenario group | naive | deferred |
|---|---|---|
| Core (transform + overflow:hidden + filter), popover & dialog | **PASS** | **PASS** |
| Ancestor sweep (9 ancestor configurations) | **9/9 PASS** | **9/9 PASS** |
| Viewport-edge positioning | **PASS** | **PASS** |
| Nested overlays | **PASS** | **PASS** |

Pixels stayed on top and geometry stayed viewport-relative for every in-window
sample, and every overlay actually closed afterwards.

### WebKitGTK 2.52.3 (WebKitWebDriver, `AppleWebKit/605.1.15 Version/60.5`)
**WebKit evidence only. This is not Safari, and is not certification of any
Safari version.**
Capabilities: `popover` ✓ · `showModal` ✓ · **`overlay` ✗ (unsupported)** ·
`transition-behavior: allow-discrete` ✓ · `@starting-style` ✓ · `inert` ✓

| Scenario group | naive | deferred |
|---|---|---|
| Core, popover & dialog | **FAIL** | **PASS** |
| Ancestor sweep | **0/9 PASS** | **9/9 PASS** |
| Viewport-edge positioning | **FAIL** | **PASS** |
| Nested overlays | **FAIL** | **PASS** |

### Firefox / Gecko — **UNVERIFIED**
No Gecko runtime could be executed. Routes attempted and their outcomes:

- `npx playwright install firefox` → **HTTP 403**, the Playwright CDN is not on
  this environment's egress allowlist.
- `ftp.mozilla.org`, `archive.mozilla.org`, `download.mozilla.org`,
  `releases.mozilla.org`, `product-details.mozilla.org` → all refused (000).
- `packages.mozilla.org` apt repository → blocked.
- `ppa.launchpadcontent.net` (mozillateam PPA), `launchpad.net` → blocked.
- `snapcraft.io`, `api.snapcraft.io` → blocked.
- `apt-get install firefox` on Ubuntu 24.04 → `1:1snap1-0ubuntu5`, a snap
  transitional stub containing no binary.
- `apt-cache search firefox|gecko|xulrunner|iceweasel` → only snap stubs.
- No pre-existing browser binary on the cloud container.
- The user's device VM → no browser installed; same Mozilla hosts blocked.

## 4. Pixel / rendering evidence — the WebKit failure mechanism

The decisive trace, WebKit, `popover/naive/ancestor=none` (raw, from
`p0-results.json`):

```
elapsed=  65ms  pixel=ON_TOP   display=block  overlay=(unsupported)  viewportPositioned=true   rect={x:308,y:215,w:284,h:132}
elapsed= 309ms  pixel=COVERED  display=block  overlay=(unsupported)  viewportPositioned=true   rect={x:311,y:216,w:279,h:130}
elapsed= 598ms  pixel=COVERED  display=block  overlay=(unsupported)  viewportPositioned=true   rect={x:312,y:217,w:276,h:129}
elapsed= 989ms  pixel=COVERED  display=block  overlay=(unsupported)  viewportPositioned=true   rect={x:312,y:217,w:276,h:129}
elapsed=1377ms  pixel=COVERED  display=none   overlay=(unsupported)  viewportPositioned=false  rect={x:0,y:0,w:0,h:0}
```

**Observation.** The element remains `display: block`, remains laid out, and
remains correctly positioned against the viewport for the whole animation —
but from ~300 ms onward its pixels are painted **beneath** the cover.

**Interpretation.** WebKit removes the element from the **top layer's paint
order** the moment it is closed, while the CSS transition continues to animate
it in normal flow. Layout survives; paint priority does not. This is precisely
why a computed-style or DOM-presence check would have reported success — the
pixel oracle is the only signal that caught it.

**Engine limitation.** No `overlay` property, so there is no mechanism to defer
the top-layer removal.

**Architectural implication.** In an engine without `overlay`, any exit
animation driven by closing the element first will paint below other content
for its entire duration, and (with a transformed ancestor) can additionally be
clipped.

## 5. Failure modes discovered — classified

Four failures were observed during this prototype. **Three were mine.**

| # | Symptom | Classification | Resolution |
|---|---|---|---|
| 1 | Every scenario failed, including Chromium with `overlay` supported | **Harness/oracle issue** — `document.elementFromPoint()` does not return a closing popover, so hit-testing reported demotion that had not happened | Replaced hit-testing with a screenshot pixel oracle |
| 2 | Chromium naive failed the final exit frame everywhere | **Harness/oracle issue** — sample labels were *intended sleeps*, not real elapsed time; each screenshot costs 50–150 ms, so "t=250ms" samples actually landed after the 400 ms transition had legitimately ended | Added a page-side `performance.now()` clock; lengthened the transition to 1200 ms; judged only samples inside the true window |
| 3 | Viewport-edge scenario failed in both engines and both variants | **Harness issue ×2** — (a) the `[popover]` UA stylesheet sets `inset: 0`, which over-constrained the box and pinned it left; (b) the geometry oracle demanded a flush right edge while the exit animation legitimately *scales the box inward* | `left: auto` on the edge rule; scale-tolerant geometry check |
| 4 | Nested naive reported the outer overlay dying with the inner | **Harness issue** — the check ran 500 ms into a 1200 ms transition, so a still-animating inner overlay was misread | Wait for the full transition before judging |
| 5 | **WebKit naive loses top-layer paint from ~300 ms, every ancestor, popover and dialog** | **Browser limitation** — genuine, reproducible, 0/9 in the sweep | No workaround within the naive strategy |

Recording these matters: three plausible-looking "browser bugs" were
measurement artefacts. Any future re-run of this prototype must keep the pixel
oracle, the page-side clock and the scale-tolerant geometry check.

## 6. Independently verified feature-support data

Checked directly, not carried over from the original hypothesis.

**MDN** — `overlay` is **Limited availability, not Baseline**: "this feature is
not Baseline because it does not work in some of the most widely-used
browsers." Two properties of the feature matter architecturally:

- **`overlay` can only be set by the browser. Author styles cannot change it.**
  The only thing an author may do is name it in `transition-property`, to defer
  the element's removal from the top layer.
- It animates only as a discrete transition, requiring
  `transition-behavior: allow-discrete`.

**caniuse (`mdn-css_properties_overlay`)** — global usage **73.51%**:

| Engine | Support |
|---|---|
| Chrome | **117+** (not supported 4–116) |
| Edge | **117+** (not supported 12–116) |
| Opera | **103+** |
| Samsung Internet | **24+** |
| **Firefox** | **Not supported — all tracked versions 2–157** |
| **Safari** | **Not supported — 3.1 through 27**; Technology Preview unknown |
| **Safari on iOS** | **Not supported — 3.2 through 26.6** |

**Distinguishing the categories the evidence actually supports:**

- *Feature support:* Chromium-family only.
- *Partial support:* none observed — it is present or absent.
- *Implementation differences:* Chromium honours `overlay` in the transition
  list; WebKitGTK ignores an unknown property, as required.
- *Animation / top-layer behaviour:* verified at runtime for Chromium and
  WebKit (§3–4). **Not** verified at runtime for Gecko.
- *Unsupported behaviour:* observed directly in WebKitGTK; for Firefox and for
  real Safari, non-support is established by **compatibility data only**.

**The Safari caveat.** WebKitGTK 2.52.3 is a real WebKit engine and its
`overlay` non-support is consistent with caniuse's Safari rows, but WebKitGTK
is not Safari and shares no release train with it. Safari remains **verified by
support data, unverified by runtime test**.

## 7. Architecture options

`overlay` is not author-settable, so "use native `overlay`" is not really a
foundation — it is one optional line in a transition list. The genuine
foundation is the **top layer** (`popover` / `<dialog>.showModal()`), which
worked in both engines tested, in every ancestor configuration.

| | **A. Native `overlay` only** | **B. Deferred close (robust fallback)** | **C. Hybrid: native where supported, deferred elsewhere** |
|---|---|---|---|
| **Correctness (measured)** | Chromium 100%; **WebKit 0%** | **Chromium 100%, WebKit 100%** | 100% where correctly branched |
| **Browser coverage** | 73.51% (caniuse) | Bounded by `popover` / `<dialog>`, not by `overlay` | 100% |
| **Animation behaviour** | Browser-managed; no JS timing | JS owns the animation window; must handle interrupt/re-open | Two different timing models in one component |
| **Stacking / top layer** | Held only where supported | Held everywhere — element is still *open* throughout | Held everywhere |
| **SSR / hydration** | Pure CSS, no SSR impact | Needs a browser-only timer/listener; must run in `afterNextRender`, never on the server | Union of both |
| **Accessibility** | Element closes immediately → focus return and `inert` release happen at once | Element stays open during the exit — **focus return, `inert` release and `aria-expanded` must be decoupled from the visual animation**, or AT state lags the animation | Two a11y timing paths to verify |
| **Runtime cost** | Zero JS | One class toggle + one `transitionend`/`animationend` listener with a timeout guard; ~20–30 lines | Same as B plus a capability check |
| **Implementation complexity** | Trivial | Low — a small state machine (`open → closing → closed`) | **Highest** — two exit code paths |
| **Maintenance risk** | Silent visual breakage in ~26% of traffic | Low; one path, engine-independent | **Highest** — divergent behaviour reproducible only on specific engines; every overlay bug must be triaged twice |

## 8. Decision — **CONDITIONAL GO**

**GO** on the overlay foundation: `popover` + `<dialog>.showModal()` + `inert`,
with **deferred close as the single exit code path** (option B).

The evidence does not support option A, and it does not support option C
either. Option C's only benefit over B is saving ~25 lines of JS in Chromium,
and it costs a permanently doubled exit-path test surface plus two accessibility
timing models. **B is a strict superset of A's measured behaviour: it passed
every scenario in both engines, including the ones where A passed.** Adding
`overlay` to the transition list on top of B is dead code — under B the element
is never closed while animating, so `overlay` never transitions.

**Answering the architectural question directly:** `overlay` is not the wrong
foundation, because it was never a foundation. The top layer is the foundation,
and it is sound. `overlay` is a Chromium-only convenience that becomes
redundant the moment a cross-engine exit strategy exists — which TEKAD needs
regardless.

**The conditions attached to the GO:**

1. **Firefox/Gecko runtime behaviour is UNVERIFIED.** Compatibility data says
   Gecko does not support `overlay`, which predicts the naive path fails there —
   but we have not observed it. Because the recommendation is B, which does not
   depend on `overlay` at all, this unknown does **not** block locking the
   architecture. It would have blocked option A or C.
2. **Real Safari is unverified.** Same reasoning: B does not depend on the
   feature Safari lacks.
3. What must still be verified in Gecko and real Safari is the **`popover` /
   `<dialog>` / `inert` substrate itself**, not `overlay`.

## 9. Remaining unknowns

- Gecko runtime behaviour of the deferred strategy — **the material open item**.
- Real Safari (macOS/iOS) runtime behaviour, incl. the documented iOS quirks
  around `<dialog>` and the virtual keyboard.
- Screen-reader behaviour of `<dialog>.showModal()` — untouched by this
  prototype and still the open question from the research phase.
- Interrupt semantics: re-opening mid-exit, and rapid open/close cycling.
- Whether `popover="auto"` light-dismiss interacts badly with a deferred close
  (this prototype used `popover="manual"` throughout).
- `showModal()` force-closing `auto` popovers — not exercised here.

## 10. Recommended next step

1. Re-run this harness unchanged on a machine with **real Firefox and real
   Safari**. It is self-contained; `run3.mjs` needs only a driver adapter.
2. Extend the harness with interrupt cases (re-open mid-exit, rapid cycling).
3. Then implement the deferred-close state machine as the TEKAD overlay
   primitive, with focus return and `inert` release fired on *close intent*,
   not on animation end.
4. Proceed to **P1** (`@angular/aria` `ngGridCell` under `@for`), which gates
   ADR-014 independently of this result.

---

## Reproducing

```bash
npm i -D playwright pngjs
apt-get install -y webkit2gtk-driver xvfb        # WebKitGTK engine
ENGINE=chromium  node run3.mjs
ENGINE=webkitgtk node run3.mjs
```

Results merge into `p0-results.json`; screenshots land in `shots/`.
Add a driver adapter (≈20 lines, see `chromiumAdapter`) to run any other engine.

---

# Hardening pass — production lifecycle (2026-08-27)

Scope: this pass does **not** re-test browser top-layer behaviour (established
above). It stress-tests the **candidate TEKAD overlay primitive** —
`DeferredOverlay` in `harness4.html` — against production lifecycle hazards.
Runner `run4.mjs`, raw results `p0-hardening.json`.

## H1. Results, stated per engine

**Do not read these as a single aggregate score.** The engines were not equally
exercisable, and the differences are the point.

**Chromium** (Playwright build 1194, `HeadlessChrome/141`)
> Cases 1–13: **PASS**. Case 9b: **NOT APPLICABLE** (by definition, see H2).

**WebKitGTK 2.52.3** — *WebKit evidence only; this does not certify Safari*
> Cases 1–7: **PASS**. Case 8: **UNVERIFIED** — the W3C WebDriver protocol has
> no media-feature emulation, so `prefers-reduced-motion` could not be forced.
> Cases 9–13: **PASS**. Case 9b: **NOT APPLICABLE**.

**Firefox / Gecko**
> **UNVERIFIED** — no Gecko runtime is obtainable in this environment. Not a
> single case was executed. No Gecko behaviour is inferred from WebKit.

### Correct summary sentence

> Implementation hardening passes in Chromium and WebKitGTK for all executable
> cases, with WebKit reduced-motion remaining UNVERIFIED due to driver
> capability. Firefox/Gecko remains UNVERIFIED.

UNVERIFIED states are **not** converted to PASS by inference anywhere.

| # | Case | Chromium | WebKitGTK | Gecko |
|---|---|---|---|---|
| 1 | Re-open during exit | PASS | PASS | UNVERIFIED |
| 2 | Rapid open→close cycling (7×) | PASS | PASS | UNVERIFIED |
| 3 | Interrupted / cancelled transition | PASS | PASS | UNVERIFIED |
| 4 | Zero transition duration | PASS | PASS | UNVERIFIED |
| 5 | Consumer CSS duration override | PASS | PASS | UNVERIFIED |
| 6 | Destroy during closing | PASS | PASS | UNVERIFIED |
| 7 | Multiple transition properties (decoy) | PASS | PASS | UNVERIFIED |
| 8 | `prefers-reduced-motion` | PASS | **UNVERIFIED** ¹ | UNVERIFIED |
| 9 | Browser-driven light-dismiss **reconciliation** | PASS | PASS | UNVERIFIED |
| 9b | **Deferred exit animation under `auto` light-dismiss** | **NOT APPLICABLE** ² | **NOT APPLICABLE** ² | UNVERIFIED |
| 10 | Focus / a11y lifecycle ordering | PASS | PASS | UNVERIFIED |
| 11 | Resource / lifecycle leak audit | PASS | PASS | UNVERIFIED |
| 12 | `toggle` reconciliation re-entrancy | PASS | PASS | UNVERIFIED |
| 13 | Safety-timeout semantics + duration parsing | PASS | PASS | UNVERIFIED |

¹ Harness limitation, not a failure. The code path it exercises (a ~zero exit
duration that fires no `transitionend`) is covered independently by case 4,
which **passed** in WebKit.

² Not a failure and not a pass — structurally impossible. See H2.

Every case in `p0-hardening.json` carries a `classification` block keeping
**implementation invariant proven** / **browser behaviour observed** /
**assumption** / **unverified** strictly apart.

## H2. The `popover` mode contract — case 9 vs case 9b

Case 9 **PASS must not be read as "`popover="auto"` supports a deferred exit
animation."** It does not.

What the evidence actually proves, identically in both engines:

- a **genuine pointer event** (Playwright `mouse.click` / WebDriver Actions
  pointer sequence) triggers browser-driven light-dismiss — a synthetic
  `.click()` did not trigger it at all;
- the browser removes the auto popover from the top layer **before** the
  `toggle` event reaches the controller:

```json
{ "entryPoint": "toggle event (newState=closed)",
  "controllerStateAtEntry": "open",
  "exitAnimationWasInFlight": false,
  "elementStillInTopLayer": false,
  "handledBy": "_hardReset (reconcile, do not animate)" }
```

- the controller **successfully reconciles** that browser-driven close;
- **no stale timers or listeners remain** (balances 0);
- a guaranteed deferred visual exit animation is **impossible** on this path.

### Normative contract

| Mode | Ownership | Guarantee |
|---|---|---|
| **`popover="manual"`** | TEKAD owns dismissal | **The deferred visual exit lifecycle is guaranteed.** |
| **`popover="auto"`** | Browser owns light-dismiss | TEKAD reconciles the already-closed state. **A deferred exit animation is NOT promised.** |

A component that must guarantee an exit animation uses `popover="manual"` and
owns its own dismissal logic.

## H3. Findings behind the contract

**Case 1 — proven by observable invariant, in four legs.** The first run
reported FAIL because the assertion required a stale callback to be
*suppressed*; the implementation is stronger than that — `open()`
**pre-emptively cancels** the pending timer and listener, so no stale callback
survives. Rather than weaken the assertion, it was replaced with observable
invariants, all four verified in **both** engines: (1) after
open → close → reopen → wait **beyond the original exit duration**, the overlay
is still open and still painting on top; (2) a **subsequent close then works
normally**, proving nothing stale was left behind; (3) **exactly one real
close** occurred, with listener and timer counts balanced; (4) the
**stale-token guard** independently rejected a hand-fired stale completion.

**Case 11 — leak audit.** Four rounds of open → close → reopen-mid-exit → close
plus a probe round produced, in both engines: listener balance **0**, timer
balance **0**, no pending work, no stuck `closing` state, and **5 real closes
for 9 intents** — the four suppressed being exactly the reopen-cancelled ones.
One synthetic exit-property `transitionend` dispatched mid-close was **handled
exactly once**, proving no duplicate listener registration.

**Case 12 — `toggle` re-entrancy.** A latent hazard was found and fixed during
this pass: `_hardReset()` originally set `state = 'closed'` *after* calling
`hidePopover()`, so a synchronously-dispatched `toggle` would have re-entered
the handler. The fix enters the terminal state **before** the DOM call and adds
an explicit re-entrancy guard.

> In both engines tested, `toggle` was delivered **asynchronously**
> (`toggleEventsSeen: 1`, `reentrantResetsBlocked: 0`), so the browser runs do
> **not** prove the re-entrancy invariant. It is proven separately and
> deterministically in **§H8**. Close accounting was correct here: **0 real
> closes for 1 intent** — the external close reconciled without double-counting.

**Case 13 — duration parsing and safety-timeout semantics.** All eight CSS
shapes parsed identically and correctly in both engines:

| Configuration | Expected | Actual |
|---|---|---|
| default `scale 1200ms` | 1200 | 1200 |
| `transition: all 300ms` | 300 | 300 |
| `scale 200ms` + `100ms` delay | 300 | 300 |
| `scale 0.5s` (second units) | 500 | 500 |
| exit property absent | 0 | 0 |
| 3 properties, 1 duration (mismatch) | 150 | 150 |
| multi-property list, `scale` 2nd | 250 | 250 |
| zero duration | 0 | 0 |

And critically: after a real `transitionend` completed the close, the safety
timer was disarmed — `actualCloses` stayed at **1** through and beyond the
window in which the timeout would otherwise have fired.
**The safety timeout is a fallback only and never produces a second close.**

## H4. Accessibility contract — four distinct layers

The prototype deliberately separates these. Only the first three are observed.

| Layer | What happens | Status |
|---|---|---|
| **1. Close intent** | `aria-expanded="false"` on the trigger; focus restored to the invoker; interaction state released | **Observed** (case 10) |
| **2. Visual exit** | CSS animation runs while the element is still open and still in the top layer | **Observed** (cases 1, 7, 10) |
| **3. Actual close** | DOM / top-layer removal, after the animation | **Observed** (cases 1, 10) |
| **4. Assistive-technology behaviour** | What a screen reader announces, and when | **UNVERIFIED** |

**No screen-reader correctness is claimed.** Case 10 verifies the *ordering of
DOM and ARIA state changes* only. Nothing in P0 tested assistive technology.

### On `aria-hidden`

The candidate originally set `aria-hidden="false"` on the overlay at close
intent. **That was removed.** It is a no-op at best and an anti-pattern at
worst, and it was not load-bearing for any test — removing it changed no
verdict. The production implementation must instead apply **role-appropriate
WAI-ARIA semantics for the concrete overlay** (a modal dialog: `aria-modal`
plus `inert` on the background; a listbox or menu popup: `aria-expanded` and
`aria-controls` on the trigger, per the APG pattern), rather than a generic
`aria-hidden` rule invented by the primitive.

## H5. The TEKAD overlay primitive contract

Normative requirements, each backed by a passing case.

1. **Deferred close is the single exit path.** The element stays open — hence
   in the top layer — for the whole exit animation.
2. **Accessibility is released at close *intent*, not at animation end.**
   (Case 10.)
3. **The exit duration is read from computed style for the named exit
   property; never hard-coded.** Handles `all`, delays, second units,
   multi-property lists and list-length mismatches. (Cases 5, 13.)
4. **A duration of ~0 closes immediately**, never awaiting a `transitionend`
   that will not fire. (Cases 4, 8, 13.)
5. **A safety timeout derived from the measured duration is always armed, and
   is disarmed by a real completion so it can never cause a second close.**
   (Cases 3, 13.)
6. **`transitionend` / `transitioncancel` are filtered by both `propertyName`
   and `target`.** (Case 7.)
7. **A monotonic token invalidates stale completions, and `open()`
   pre-emptively cancels pending work** — two independent defences. (Cases 1, 2.)
8. **`destroy()` cancels every timer and listener; no callback may touch a
   destroyed or unmounted element.** (Case 6.)
9. **Browser-driven dismissal is reconciled, not fought**, via `toggle` (and
   `close` for `<dialog>`); terminal state is entered **before** the DOM close
   call, with a re-entrancy guard. (Cases 9, 12.)
10. **Exit animations are guaranteed only under `popover="manual"`.** (H2.)
11. **Listener and timer balance is asserted in tests.** (Cases 2, 11.)
12. **Role-appropriate ARIA semantics belong to the concrete component**, not
    to a generic rule in the primitive. (H4.)

## H6. Two conclusions

### Architectural decision — **LOCKED, unchanged**

```
Top-layer substrate      popover / <dialog>.showModal() / inert
        +
Deferred close           single TEKAD-owned visual exit lifecycle
        +
popover="auto"           browser-owned light-dismiss reconciliation
        NOT
native CSS `overlay`     rejected as a separate exit strategy
```

Nothing in the hardening evidence contradicts the decision recorded above, so
it is not reopened.

### Production-readiness — **contract hardened; cross-engine and AT validation outstanding**

The strategy is specified precisely enough to begin implementation: 12
normative requirements, each tied to a reproducible case, with a reference
implementation in `harness4.html`. One latent re-entrancy hazard was found and
fixed by this pass.

Explicitly **not** validated, and tracked as work rather than assumed:

- **Firefox / Gecko** — the entire matrix, hardening included.
- **Real Safari (macOS and iOS)** — WebKitGTK is not Safari.
- **Screen readers** — no assistive technology tested at any point.
- **`prefers-reduced-motion` in WebKit** — driver limitation.
- **Synchronous `toggle` delivery** — not observed; the guard is untriggered.
- **Mobile virtual keyboard** interaction with an anchored overlay.
- **`showModal()` force-closing `auto` popovers** — not exercised.

## H7. P0 closing status

**CONDITIONAL GO — architecture locked; candidate lifecycle contract hardened;
cross-engine and assistive-technology validation remains tracked separately.**

The residual unknowns do not block implementation, because the chosen strategy
depends on `popover` / `<dialog>` / `inert` — not on any feature known to be
missing in the unverified engines. They must be closed before TEKAD claims
cross-browser or accessibility conformance publicly.


---

# H8. P0 FINAL — RCA, targeted fix & verification

## Evidence classification

Every conclusion in this document carries one of these labels. They are not
interchangeable, and an UNVERIFIED result is never upgraded by inference.

| Label | Meaning |
|---|---|
| **OBSERVED** | Directly observed in a real browser engine. |
| **PROVEN IMPLEMENTATION INVARIANT** | Proven by deterministic implementation/unit testing. |
| **DEFENSIVE / SIMULATED** | A deliberately simulated condition, used to prove a defensive invariant. Not browser evidence. |
| **UNVERIFIED** | Cannot currently be tested in the available environment. |

## RCA — root cause

`_hardReset()` assigned the terminal state **after** invoking the browser close
operation:

```
_hardReset()
  -> hidePopover() / close()
  -> possible synchronous lifecycle callback
  -> _onToggle()
  -> _hardReset() re-entered while the controller is not yet terminal
```

**Root cause:** the terminal state (`state = 'closed'`) was not established
before control could leave the method. `_onToggle()` guards on
`state !== 'closed'`, so during that window the guard was ineffective and a
synchronously-delivered `toggle` would re-enter cleanup — duplicating terminal
work and corrupting close accounting.

This is a **latent ordering defect**, not a browser bug. Whether it manifests
depends entirely on when the engine chooses to deliver the notification.

## FIX

Two changes in `deferred-overlay.mjs`:

```
_hardReset()
  -> state = 'closed'          // terminal state established FIRST
  -> closeOp()                 // platform close operation
  -> possible callback
  -> callback observes 'closed' and returns
```

1. **Ordering.** The terminal state is assigned before the close operation, so
   any nested handler observes `closed`.
2. **`_resetting` guard.** Held for the duration of the terminal transition, so
   nested cleanup cannot run twice even if the state check were ever bypassed.

The close operation is now an **injectable `closeOp`** — a platform seam that
also collapses the previous `popover`/`dialog` branch into one call site. It is
a legitimate design boundary, not a test-only hook.

## TARGETED PROOF — `reentrancy.test.mjs`

**Evidence class: DEFENSIVE / SIMULATED.** Synchronous delivery is simulated at
the `closeOp` seam. **This is not browser evidence** and is never reported as
OBSERVED. No attempt was made to coerce a real engine into changing its
dispatch timing.

**16/16 assertions pass.** Proven as implementation invariants:

- the terminal state is `closed` **before** the simulated close operation runs;
- a synchronous `_onToggle()` observes `closed`;
- the `_resetting` guard is held while the nested callback runs;
- no recursive `_hardReset()` performs duplicate cleanup (`maxResetDepth === 1`);
- no duplicate close is recorded; the close operation runs exactly once;
- no duplicate listener registration or removal;
- no stale timer and no stale transition callback remain;
- the final state is `closed`; cleanup is balanced;
- no stuck `closing` class or state.

A **control** assertion reproduces the pre-fix ordering against a local replica
and confirms it *does* re-enter (`maxResetDepth > 1`, terminal state written
more than once). Without it the assertions above could be vacuous.

## STATE-MACHINE REVIEW — second-order

`_onToggle` · `_hardReset` · `_finish` · `_clearPending` · `open` · `close`
were reviewed as one machine against every hazard listed. No redesign was made.

Clear on inspection, with the guarding mechanism named: double close
(token + `state === 'closing'` check + `close()` early-return) · recursive
close (§H8 proof) · stale timer and stale `transitionend`/`transitioncancel`
(`_clearPending` on every transition, plus target/property filtering) ·
close-after-reopen race (monotonic token + pre-emptive cancellation) ·
browser-dismissal race (`_onToggle` state check; a stale `_finish` is rejected
by the `closing` check) · duplicate listener (`_clearPending` before add) ·
incorrect close accounting (`actualCloses <= closeIntents`; browser dismissals
counted separately) · cleanup after destruction (`destroyed` checked first in
`_finish` and `_onToggle`).

**One concrete defect found and fixed:**

> `destroy()` cleared timers and listeners but left the `closing` class on the
> element and left `state` at `'closing'`. A destroyed controller therefore
> leaked visual exit state onto a DOM node that outlives it — relevant because
> a framework may reuse host nodes — and reported a misleading state.
> **Fix:** `destroy()` now removes the `closing` class and sets `state` to
> `'closed'`. It deliberately does **not** close the element; unmounting is the
> caller's concern. Covered by three new assertions.

## Final status of each claim

| Claim | Label |
|---|---|
| Top-layer retention across 9 ancestor configurations, viewport edge, nesting | **OBSERVED** (Chromium, WebKitGTK) |
| WebKit demotes a closing overlay from top-layer paint while layout survives | **OBSERVED** (WebKitGTK) |
| Browser-driven light-dismiss removes the element before `toggle` is delivered | **OBSERVED** (Chromium, WebKitGTK) |
| Duration parsing across 8 CSS shapes; safety timeout never double-closes | **OBSERVED** (Chromium, WebKitGTK) |
| Lifecycle hazards 1–7, 9–13 | **OBSERVED** (Chromium, WebKitGTK) |
| Synchronous re-entrancy invariant | **PROVEN IMPLEMENTATION INVARIANT** via **DEFENSIVE / SIMULATED** delivery |
| `destroy()` leaves no stale visual state | **PROVEN IMPLEMENTATION INVARIANT** |
| Synchronous `toggle` delivery by a real engine | **UNVERIFIED** — not observed in either engine |
| `prefers-reduced-motion` in WebKit | **UNVERIFIED** — driver cannot emulate the media feature; the zero-duration test supports the no-transition safety path but does **not** prove reduced-motion browser behaviour |
| Firefox / Gecko, all cases | **UNVERIFIED** |
| Real Safari (macOS, iOS) | **UNVERIFIED** |
| Assistive-technology behaviour | **UNVERIFIED** — DOM/ARIA ordering tested; no screen reader tested |
| Mobile-specific behaviour; `showModal()` vs auto popovers | **UNVERIFIED** |

## FINAL P0 DECISION

**CONDITIONAL GO.** Architecture locked. Overlay lifecycle contract defined.
Candidate implementation hardened. Remaining browser and assistive-technology
validation explicitly tracked, not inferred.
