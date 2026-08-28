# Composition & Headless Strategy

Research date 2026-08-26.

## The pattern every credible modern library converged on

Radix NG, Spartan/ui, ng-primitives, Clarity and `@angular/aria` arrived
independently at the same shape: **a DOM-agnostic behaviour core wrapped by a
thin framework binding**, with styling supplied by the consumer or by an
optional layer above.

`@angular/aria` is the clearest instance. Its published typings show
`listbox.d.ts` importing `OptionPattern` and `ListboxPattern` from a private
`_listbox-chunk.js`, alongside `_list-navigation`, `_list-typeahead`,
`_keyboard-event-manager`, `_click-event-manager` and `_collection` chunks.
The pattern is a signal-driven state machine; the directive only binds it to a
host element. That makes behaviour unit-testable without TestBed and reusable
by both a headless and a styled tier.

## TEKAD's three tiers over one implementation

```
Primitive   headless behaviour — focus, dismiss, ids, dir, measurement
Pattern     @angular/aria pattern + TEKAD gap-fillers (overlay-based patterns)
Component   ready-to-use, styled, typed, form-integrated
```

A standard button, input, dialog or table must be usable at the Component tier
with no knowledge of the tiers below. Assembling primitives is the *advanced*
path, never the default.

## Mechanisms

- **`hostDirectives`** for composition — Angular-native, keeps primitives
  independently testable, and avoids both inheritance and wrapper-element
  bloat. v22 also de-duplicates host directives.
- **Content projection and template outlets** for structural slots.
- **DI providers and injection tokens** for configuration, not option objects.
- **Content queries** for parent/child coordination.

Note the direction of travel in Angular's own repo: v22 removed constructors
with rest arguments across `angular/components`, which breaks subclass-based
extension. Inheritance is being designed out; composition is being designed in.

## The state contract: data attributes

Radix NG exposes component state as `[data-open]`, `[data-disabled]` and
similar, and documents styling against them. This is the highest-leverage,
lowest-cost decision available to TEKAD:

- any styling strategy — plain CSS, SCSS, Tailwind, CSS-in-JS — can hook in;
- the library ships no styling opinion with the behaviour;
- the headless and styled tiers share one contract;
- it composes with `@angular/aria`, which already reflects state into ARIA
  attributes that CSS can also target.

TEKAD adopts a `[data-*]` state contract as public API, documented and
versioned like any other public surface.

## Rejected shapes

- **Boolean-flag / config-object components.** PrimeNG and NG-ZORRO show where
  this ends: extension requires a library release, and the API surface grows
  without bound.
- **Mandatory root wrapper.** Taiga's `<tui-root>` anchors portals and theme
  variables but forces every consumer app to adopt the library's shell and
  makes partial adoption impossible. TEKAD uses an injectable overlay service
  plus `:root` token declarations instead.
- **Headless-only.** Hostile to the majority use case.
- **Inheritance-based extension.**

## Customization discipline

Each exposed slot is public API with a compatibility obligation. Slots are
added deliberately, in response to a real need, never speculatively, and
internal implementation detail is never exposed merely to enable
customization.

## Optional idea, deferred

Spartan/ui's two-layer model — behaviour from npm, styles **copied into the
consumer's codebase** by a CLI — gives unlimited restyling freedom and zero
style-upgrade breakage, at the cost of consumers never receiving style
bugfixes. Worth revisiting once the styled layer is stable; not a v1 concern.
