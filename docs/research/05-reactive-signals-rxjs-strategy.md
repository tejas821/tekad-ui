# Reactive Strategy — Signals canonical, RxJS as adapter

Research date 2026-08-26. Sources: angular.dev signals/rxjs-interop/zoneless
guides, ChangeDetectionStrategy API docs, v22 announcement.

## Verified platform facts

- Core primitives: `signal`, `computed` (lazy + memoized), `effect`,
  `linkedSignal`, `untracked`.
- `resource()` and `httpResource()` are **production-ready in v22**.
  `rxResource()` accepts a `stream` factory returning an Observable.
- **Zoneless is the default from v21+**; `provideZoneChangeDetection()` opts
  back in.
- **`OnPush` is the default** for components that declare no strategy.
  `ChangeDetectionStrategy.Default` is **deprecated**, renamed `Eager`.
- `toObservable(sig)` tracks the signal in a `ReplaySubject` via an effect,
  emits only after the signal **stabilises** (rapid writes collapse to one
  emission), and needs an injection context or explicit `Injector`.
- `toSignal(obs)` rethrows the observable's error on read and retains the last
  value after completion; `requireSync` or `initialValue` avoids `undefined`.

## Documented anti-patterns

Angular's own guidance: do **not** use `effect()` for synchronous or
asynchronous derivations (use `computed` / `linkedSignal`), for rendering
(template bindings handle it), or as the default reaction to state change.
Effects lose tracking across asynchronous boundaries.

## TEKAD rules

1. Every component's state is a `signal` / `model`. Derived state is
   `computed`. No exceptions in the Component and Pattern layers.
2. An Observable surface, where offered, is `readonly xChanges$ = toObservable(this.x)`
   — created lazily, derived from the canonical signal. Never a mirrored
   `BehaviorSubject`.
3. Consumer-supplied Observables are converted **once**, at the API boundary,
   with `toSignal`.
4. RxJS is used directly only where it is the right abstraction: debounced
   input, cancellation, retry, event-stream composition, server-driven data.
   Prefer `resource`/`httpResource` where they fit; reach for operators when
   the pipeline needs them.
5. `effect()` is reserved for side effects at the edge — focus, DOM writes,
   announcements — never for assignment between reactive values.
6. A `Subject` holding state is a review blocker. A `Subject` modelling an
   event stream is fine.

## The OnPush-by-default caveat that matters to library authors

Angular's zoneless guide notes that a library component which **hosts
user-supplied components** cannot safely be OnPush, because that breaks refresh
for non-OnPush (`Eager`) children.

- `<ng-content>` projection is **safe** — the host view owns change detection.
- `ViewContainerRef`-created consumer components are the risk.

TEKAD implication: components that instantiate consumer components dynamically
(dialog content, table cell components, overlay content) must be audited for
this specifically. Everything else relies on the v22 OnPush default.

For zone-based consumers, retain `NgZone.run()` / `runOutsideAngular()` where
used; remove any reliance on `onMicrotaskEmpty` / `onUnstable` / `onStable`.
