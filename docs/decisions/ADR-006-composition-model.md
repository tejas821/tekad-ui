# ADR-006 — Composition model

**Status:** Accepted · **Date:** 2026-08-26

## Context
Complex components fail in one of two directions: a configuration object /
boolean-flag explosion that is impossible to extend, or a primitive kit that
makes trivial cases laborious.

## Decision
Three consumption tiers over one implementation:

1. **Component** — ready to use, sensible defaults, no assembly required.
2. **Pattern** — the component's parts, exposed as composable child
   components/directives with intentional, documented slots.
3. **Primitive** — headless behaviour for consumers who own their markup.

Customisation points are **intentional and stable**. Internal implementation
detail is never exposed merely to enable customisation. Content projection,
template outlets, content queries and DI providers are the mechanisms;
long boolean input lists are not.

A standard button, input, dialog or table must be usable at tier 1 with no
knowledge of tiers 2 and 3.

## Alternatives
Configuration-object-driven components (rejected: extension requires a library
release); headless-only (rejected: hostile to the majority use case).

## Reason
Beginners get defaults; advanced users get the markup; experts get the
behaviour — without three implementations.

## Consequences
More design work per component. Each exposed slot is a public API with a
compatibility obligation (ADR-004, `docs/architecture/02-public-api-rules.md`). Slots are added
deliberately, never speculatively.
