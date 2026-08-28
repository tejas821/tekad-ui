# ADR-009 — Legacy ("Legendary") codebase separation

**Status:** Accepted · **Date:** 2026-08-26

## Context
Demand exists for Angular ≤21 support. Serving it from one codebase means
NgModule wrappers, RxJS-first internals and version-gated code paths
permanently degrading the modern architecture.

## Decision
The Angular ≤21 "Legendary" series is a **separate future codebase**. It is
not implemented now, and no legacy constraint may influence this repository's
architecture. Migration tooling between the lines is a future concern and is
not built until explicitly requested.

## Alternatives
Single codebase with compatibility layers (rejected: permanent tax on the
modern line); no legacy support at all (deferred, not decided — the Legendary
line remains an option, not a commitment).

## Reason
Compatibility layers are paid for forever by the users who need them least.

## Consequences
Two codebases if Legendary is ever built, with duplicated effort. Brand
versioning stays independent of Angular's version number: the brand is
**TEKAD**, never "TEKAD 22" or "TEKAD Angular 22". Angular compatibility is
expressed in package metadata and documentation only.
