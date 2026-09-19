# ADR-001 — Angular 22-first architecture

**Status:** Accepted · **Date:** 2026-08-26

## Context

Supporting a wide Angular version range forces the lowest common denominator:
NgModule wrappers, RxJS-first internals, no signal inputs, no modern control
flow. That cost is paid forever by every consumer.

Verified platform baseline for Angular v22.0.x (angular.dev/reference/versions,
accessed 2026-08-26):

- Node `^22.22.3 || ^24.15.0 || ^26.0.0`
- TypeScript `>=6.0.0 <6.1.0`
- RxJS `^6.5.3 || ^7.4.0`

Relevant v22 capabilities: `OnPush` is the default change-detection strategy
(the old default renamed `ChangeDetectionStrategy.Eager`); Signal Forms are
stable; `@angular/aria` graduated to production; webpack builders deprecated.

## Decision

This codebase targets Angular 22 and forward only. Standalone-first. Signal
inputs/outputs/models. No NgModule as public API. No legacy compatibility
shims, no deprecated APIs, no RxJS-first internals.

## Alternatives

(a) Wide version support — rejected, contaminates the architecture.
(b) v21-first — rejected, forfeits stable Signal Forms and production
`@angular/aria`, both of which materially reduce what TEKAD must build.

## Reason

The modern primitives are exactly the ones the TEKAD architecture depends on.
Building on them is the difference between composing and reimplementing.

## Consequences

Adoption is limited to teams on v22+. Older consumers are served by the
separate "Legendary" line (ADR-009). Peer ranges and CI matrix follow the
table above. Do not use deprecated webpack builders in any new tooling.
