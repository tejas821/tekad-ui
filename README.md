# TEKAD Research Phase

These files are designed to run BEFORE the TEKAD implementation master prompt.

## Recommended order

### 1. `00-TEKAD-DEEP-RESEARCH-MASTER.md`

Run this first.

It coordinates the full research program and defines the required final handoff.

### 2. `01-COMPETITIVE-ARCHITECTURE-RESEARCH.md`

Use this as the focused forensic research pass for Angular UI libraries.

It is especially useful if the research agent needs to investigate repositories and architecture separately from the broader report.

### 3. `02-LEGAL-IP-RESEARCH-PROMPT.md`

Run in parallel or immediately after the architecture research.

It focuses on licensing, dependencies, clean-room engineering, trademark research and contributor IP.

## Handoff

The research phase must produce:

`IMPLEMENTATION_HANDOFF.md`

The implementation agent should consume that handoff together with the TEKAD Engineering Implementation Master Prompt.

## Research principle

Research first.

Decide second.

Implement third.

Do not let the implementation agent invent architecture that should have been settled during research.
