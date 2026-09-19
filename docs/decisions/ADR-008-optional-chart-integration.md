# ADR-008 — Optional chart integration

**Status:** Accepted · **Date:** 2026-08-26

## Context

Charting is a deep, specialised domain with excellent mature open-source
implementations. Owning one would dominate TEKAD's maintenance budget and
inflate the bundle for every consumer who never renders a chart.

## Decision

**TEKAD never builds a chart engine.**

Charts, if offered, are separate optional packages (e.g.
`@tekad-ui/charts-chartjs`, `@tekad-ui/charts-d3`) that declare the charting
library as an **optional peer dependency**. No core TEKAD package may depend
on, or transitively reach, a charting library. CI enforces this (gate 10).

Whether TEKAD ships wrappers at all — versus documented integration recipes —
is deferred to the research pass. A recipe may well be the better product.

## Alternatives

A first-party chart engine (rejected: NEVER BUILD); charts inside a core
package (rejected: bundle and dependency cost imposed on everyone).

## Reason

Direct application of KEEP / NEVER BUILD. The value TEKAD can add is Angular
ergonomics, theming and accessibility around an existing engine — not the
engine.

## Consequences

Chart packages track upstream licenses and versions independently. TEKAD's
own license obligations must not be entangled with a chart library's.
