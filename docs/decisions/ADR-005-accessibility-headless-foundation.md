# ADR-005 — Accessibility & headless foundation

**Status:** Accepted · **Date:** 2026-08-27 (was Proposed 2026-08-26)
**Evidence:** `docs/research/08-accessibility-strategy.md`

## Context

TEKAD needs focus management, roving tabindex, `aria-activedescendant`,
typeahead, list navigation, live announcements and deterministic IDs.
`@angular/aria` reached stable in v22: MIT, headless, **ships zero CSS**,
12 patterns over 9 runtime entry points, test harnesses per pattern,
~10–35 KB raw each.

## Decision

Build the TEKAD **Pattern** layer on `@angular/aria`. Declare it and
`@angular/cdk` as peer dependencies. Do not reimplement any WAI-ARIA pattern
behaviour it already ships.

Two verified constraints shape this:

- **It peer-pins `@angular/cdk` at an exact version** — "Aria instead of CDK"
  is not an available choice.
- **It positions nothing.** A grep of every published bundle for positioning
  APIs returns one incidental `compareDocumentPosition`. No dialog, tooltip,
  popover, focus trap, live announcer or backdrop.

TEKAD therefore owns the entire floating layer (ADR-010) and remains
accountable for accessibility in composition. Never build on
`@angular/aria/private` — it carries no compatibility guarantee.

## Alternatives

Build everything in-house — rejected, contradicts NEVER BUILD and forfeits
framework-cadence maintenance. CDK's older decorator-based `listbox`/`menu`/
`tree` — rejected for new work; not deprecated, but in maintenance while the
roadmap only promises new patterns in Aria.

## Reason

This is the largest single reduction in code TEKAD must own and test, from a
first-party source released on the framework's own cadence.

## Consequences

Hard coupling to Angular's release cadence (acceptable under ADR-001) and to
CDK's patch versions via the exact pin. TEKAD's differentiation shifts to
composition, theming, packaging, overlays, performance and DX — which is where
it should be. Keyboard, focus-restoration and ARIA state-transition tests
remain per-component acceptance criteria.
