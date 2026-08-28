# ADR-003 — RxJS adapter strategy

**Status:** Accepted · **Date:** 2026-08-26

## Context
ADR-002 makes signals canonical. RxJS must remain first-class for consumers
and for the problems it is genuinely best at, without becoming a second store.

## Decision
RxJS appears in two places only:

1. **At the public boundary, as an adapter.** Where an Observable surface adds
   real value, it is derived from the canonical signal (`toObservable`) at the
   API edge. It is a projection, never a source.
2. **Inside genuinely asynchronous pipelines.** Server-driven data, debounced
   input, cancellation, retry, event-stream composition, HTTP. Here RxJS is
   the correct abstraction and is used directly.

Consumer-supplied Observables are accepted as inputs and converted once, at
the boundary, into canonical signal state.

`resource` / `httpResource` are preferred where they fit; RxJS is used where
the pipeline needs operators.

## Alternatives
Observables everywhere (rejected — ADR-002); no Observable surface at all
(rejected — cuts off a large share of the Angular ecosystem).

## Reason
One source of truth, two consumption models, with the conversion cost paid
exactly once at a well-defined edge.

## Consequences
Every Observable in a public API must be traceable to a canonical signal.
An internal `Subject` holding state is a review blocker; a `Subject`
modelling an event stream is fine.
