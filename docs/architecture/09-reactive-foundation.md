# Reactive Foundation (Phase 3)

ADR-002 and ADR-003, enforced.

The roadmap's instruction for this phase was "**Small. Resist building a state
framework.**" This document is mostly a record of what was deliberately _not_
built, and why the thing that was built is a set of lint rules rather than a set
of utilities.

## The contract

**Signals are the single canonical internal reactive model.** All derived state
is a `computed`. `effect()` is reserved for genuine side effects at the edge —
DOM, focus, announcements — and never to copy one reactive value into another.

**RxJS appears in exactly two places.** At the public boundary, as an adapter
derived from a canonical signal; and inside genuinely asynchronous pipelines,
where it is the right abstraction and is used directly. A consumer-supplied
Observable is converted **once**, at the boundary, into canonical signal state.

One source of truth, two consumption models, conversion paid once at a
well-defined edge.

## Nothing new was built, and that is the deliverable

The obvious Phase 3 output would be a `@tekad/core/reactive` entry point with
signal-and-RxJS helpers. It does not exist, for three reasons.

**Angular already ships the adapters.** `toSignal` and `toObservable` in
`@angular/core/rxjs-interop` are exactly the boundary conversions ADR-003
describes. Wrapping them would add a TEKAD name, a TEKAD version and a TEKAD
migration cost on top of an API Angular maintains — the "KEEP" in CLAUDE.md
rule 1, refused at the first opportunity to break it.

**No caller exists.** CLAUDE.md rule 9: every abstraction needs a concrete
current use, a measured benefit, or an ADR. A helper for normalising
"value | Signal | Observable" at an API boundary is plausible and might well be
right — but the first component that actually needs it will say more about its
shape in an hour than speculation would in a week.

**A state framework is the failure mode this phase is warned about.** Signals
already are the state framework. The useful work is making sure TEKAD keeps
using them the way the ADRs say, which is a review problem, not a library
problem.

## So the deliverable is enforcement

ADR-002's Consequences section reads:

> Code review specifically rejects: mirrored `BehaviorSubject`s, `effect()` used
> as an assignment, `toSignal(toObservable(x))` round-trips, and manual
> subscription bookkeeping for state that is a derivation.

Every one of those is mechanically detectable, and a rule that lives only in a
reviewer's head stops being enforced the first busy week. They are now
`no-restricted-syntax` selectors in `eslint.config.mjs`, scoped to
`packages/**` — an application or a probe may legitimately do any of these while
adapting to someone else's API; the constraint is on what TEKAD itself ships.

| Rejected                                         | Allowed                                                                     | The distinction                                                                                                                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new BehaviorSubject(…)`, `new ReplaySubject(…)` | `new Subject(…)`                                                            | A replaying subject **is** state by construction. A plain `Subject` is an event stream and holds nothing. ADR-003 draws exactly this line.                                                   |
| `.set()` / `.update()` inside `effect(…)`        | `effect(…)` that touches the DOM or moves focus                             | The first is a derivation smuggled in as a side effect — implicit, ordering-dependent, invisible at the declaration. The second is what `effect()` is for.                                   |
| `toSignal(toObservable(x))`                      | `toObservable(signal)` at the boundary; `toSignal(consumerObservable)` once | The round-trip leaves the signal graph and comes straight back, paying subscription and scheduling cost to arrive where it started, and losing synchronous glitch-free semantics on the way. |
| `source$.subscribe(v => sig.set(v))`             | `toSignal(source$)`                                                         | The hand-rolled version needs teardown bookkeeping, has no initial value, and leaks if the subscription outlives its owner.                                                                  |

Each error message says which ADR it comes from and what to do instead, because
a lint error that only says "forbidden" gets suppressed rather than fixed.

## The rules are tested in both directions

`tools/verify-reactive-rules.test.mjs` pins nine cases: five violations that
must be reported, and four allowed forms that must not be.

The allowed cases carry as much weight as the violations. A rule that also
rejected an event-stream `Subject`, or an `effect()` that moves focus, would be
enforcing something the ADRs never said — and the natural response to a rule
that fires on correct code is to disable it. AST selectors are especially prone
to this: one that has silently stopped matching looks exactly like a codebase
with no violations.

## What Phase 3 leaves for later

- **A boundary-normalisation helper**, if and when a component needs to accept
  "value | Signal | Observable" for the same input. Built from a real call site,
  not from a guess about one.
- **`resource` / `httpResource`.** ADR-003 prefers them where they fit. Nothing
  in TEKAD fetches anything yet, so there is nothing to fit them to.
- **A rule for `providedIn: 'root'` services**, which are one of the things that
  actually defeat tree-shaking (see `08-package-architecture.md`). There are
  none yet; the tree-shaking probe grows a scenario when the first one appears.
