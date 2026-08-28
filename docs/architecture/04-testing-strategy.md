# Testing Strategy

Tests validate **behaviour**, not coverage percentage. A high-coverage suite
that asserts implementation details is a liability.

## Layers

| Layer | Validates | Applies to |
|---|---|---|
| Unit | pure logic, reactive derivations, state transitions | all |
| Component | rendered behaviour via public API only | all components |
| Accessibility | keyboard, focus order, focus restoration, ARIA state transitions, announcements | all interactive components |
| SSR / hydration | renders on the server; hydrates without mismatch | all packages |
| Package build | package builds, exports resolve, types resolve, no internal leakage | all packages |
| Tree-shaking | one import pulls only what it needs | CI, ecosystem-wide |
| Performance | render/update cost against a budget | flagship components |
| Visual regression | where visual correctness is load-bearing | theme, flagship components |

## Accessibility testing rules

Do **not** assert that an ARIA attribute exists and call it accessible.
Test the behaviour the attribute promises:

- Keyboard: every interactive path reachable and operable without a mouse.
- Focus: entry, movement, trapping where appropriate, and restoration on close.
- State: expanded/selected/checked/disabled reflected as the user perceives it.
- Announcements: live-region content is correct and not spammy.

## Coverage expectations

Flagship components (Button, Input, Select, Dialog, Table) carry the strongest
suites, including SSR and performance tests. Every bug fix ships a regression
test that fails before the fix.

## Never

Disable a test to make CI green. Weaken an assertion to accommodate a
regression. Delete a failing accessibility test.

## Tooling

**Open.** Angular v22 ships Vitest support and `@angular/aria` provides test
harnesses; the harness/runner choice is deferred to ADR-011 pending the
research pass. Choose on measured suitability, not fashion.
