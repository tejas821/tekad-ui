# ADR-000 — ADR process

**Status:** Accepted · **Date:** 2026-08-26

## Context
TEKAD is founder-led and AI-assisted. Without a durable decision record,
architecture gets re-litigated every session and agents re-derive the same
conclusions at cost.

## Decision
Meaningful architectural decisions are recorded as numbered ADRs in
`docs/decisions/`. An agent must consult existing ADRs before designing.
An ADR is never edited to reverse it; a superseding ADR is written instead.
A decision that depends on the unfinished research phase is recorded with
status `Proposed — blocked on research` rather than being invented.

## Alternatives
Decisions in commit messages (unsearchable); decisions in one large design doc
(merge-hostile, no status); no record (guaranteed drift).

## Reason
Cheap, greppable, statused, and it makes the difference between "decided" and
"assumed" visible.

## Consequences
Every agent turn starts with a decision lookup. ADR count grows; the index in
`README.md` must be kept current.
