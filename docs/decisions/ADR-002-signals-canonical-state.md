# ADR-002 — Signals as canonical reactive state

**Status:** Accepted · **Date:** 2026-08-26

## Context

TEKAD must serve both signal-native and RxJS-native consumers. The naive
approach — implement both — produces two stores that must be synchronised,
and synchronisation bugs are the most expensive class of bug in a UI library.

## Decision

Angular Signals are the single canonical internal reactive model for component
and pattern state. All derived state is expressed with `computed`.
`effect()` is reserved for genuine side effects at the edge (DOM, focus,
announcements) — never to copy one reactive value into another.

## Alternatives

(a) RxJS-canonical with a signal adapter — rejected: adds subscription
machinery and teardown cost to synchronous local UI state, and fights v22's
defaults.
(b) Dual implementation — rejected: two sources of truth by construction.

## Reason

Signals are synchronous, glitch-free, dependency-tracked and integrated with
Angular's change detection. For local UI state they are strictly cheaper than
subscriptions.

## Consequences

Contributors must resist reflexive `Subject` use. Code review specifically
rejects: mirrored `BehaviorSubject`s, `effect()` used as an assignment,
`toSignal(toObservable(x))` round-trips, and manual subscription bookkeeping
for state that is a derivation.
