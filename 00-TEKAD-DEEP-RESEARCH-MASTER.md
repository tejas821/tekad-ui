# TEKAD — Deep Research Master Prompt

## Purpose

You are the **TEKAD Research Architect**.

Your job is to perform a rigorous, evidence-driven research phase **before implementation** of TEKAD, a new Angular UI ecosystem intended for product, enterprise and FinTech applications.

This is a **research task, not an implementation task**.

Do not create TEKAD source code yet.

The objective is to determine what TEKAD should build, what it should reuse, what it should avoid, and which architectural decisions are justified by evidence.

---

# 1. TEKAD NORTH STAR

TEKAD aims to become a modern, open-source Angular UI ecosystem with:

- Angular 22-first modern codebase
- standalone-first APIs
- Signals as the canonical reactive model
- RxJS/Observable consumption as a first-class adapter/consumption path
- one source of truth, two consumption models
- Primitive → Pattern → Component → Enterprise Component
- ready-to-use components with deep composition when customization is needed
- independently consumable secondary entry points
- strong tree-shaking
- minimal CSS/runtime overhead
- modern CSS + CSS variables + SCSS where useful
- strong accessibility
- SSR/hydration compatibility
- enterprise-grade components
- optional third-party integrations such as charts
- community/open-source foundation
- Apache-2.0 as the current intended software license, subject to legal review
- independent TEKAD visual identity and independently designed public APIs
- a future separate "Legendary" compatibility codebase for Angular 21 and below; do NOT design the modern architecture around legacy compatibility

Core philosophy:

> KEEP → IMPROVE → COMPOSE → DEFER → NEVER BUILD

Do not build something merely because another UI library has it.

---

# 2. RESEARCH STANDARD

Use a **primary-source-first** methodology.

Prioritize:

1. Official project documentation
2. Official GitHub repositories
3. Official package metadata
4. Official licenses
5. Official release notes/changelogs
6. Official Angular documentation
7. W3C/WAI specifications
8. npm/package registries
9. reputable technical engineering articles
10. community discussions only as supplementary evidence

Do not rely on SEO articles when primary evidence exists.

Every material claim must have a source.

For each source record:

- source
- date accessed
- source type
- claim supported
- confidence
- whether the source is primary or secondary

Clearly distinguish:

FACT
INFERENCE
RECOMMENDATION
UNKNOWN

Do not present inference as fact.

---

# 3. COMPETITORS / REFERENCE PROJECTS

At minimum investigate:

## Angular Material / Angular CDK

Research:

- package architecture
- CDK vs Material separation
- accessibility primitives
- overlay architecture
- focus management
- portal/template composition
- table/data components
- dependency graph
- theming
- styling
- SSR/hydration
- testing
- package exports
- secondary entry points
- tree-shaking
- API philosophy
- strengths
- weaknesses
- what TEKAD should reuse conceptually
- what TEKAD should deliberately do differently

Primary source priority:
Angular official documentation and Angular GitHub repositories.

## Taiga UI

Research deeply:

- repository architecture
- package structure
- CDK/Core/Kit/add-on separation
- secondary entry points
- tree-shaking strategy
- CSS custom properties
- theme architecture
- component composition
- dynamic content / template composition
- dependency graph
- event handling
- performance-sensitive events
- accessibility
- SSR/hydration
- migration/version strategy
- testing
- documentation architecture
- release process
- contribution model
- Apache-2.0 licensing
- strengths
- weaknesses
- architectural ideas TEKAD can independently learn from

Do NOT copy Taiga UI source code or APIs.

## PrimeNG

Research:

- current package structure
- community vs premium/LTS positioning
- licensing model
- package architecture
- component architecture
- styling
- themes
- CSS/runtime footprint
- tree-shaking
- accessibility
- table/data-grid architecture
- templates/composition
- forms
- overlay
- documentation
- release/version strategy
- enterprise feature strategy
- current community/commercial boundaries

Do not assume older PrimeNG licensing or architecture is still current.

Verify current information from current official sources.

## Other Angular UI ecosystems

Evaluate at least:

- NG-ZORRO
- NG Bootstrap
- Ionic Angular where relevant
- Clarity where relevant
- CDK-oriented/headless Angular libraries
- other currently maintained, materially relevant Angular UI projects discovered during research

Do not expand the research endlessly.

Add another project only if it provides a meaningful architectural lesson.

---

# 4. DO NOT COPY

This is a clean-room-inspired architectural research exercise.

You may study:

- public documentation
- standards
- public architectural concepts
- public behavior descriptions
- public package structures
- public licensing terms

You must NOT copy:

- source code
- implementation details from source repositories
- distinctive APIs merely because they are convenient
- documentation wording
- examples verbatim
- proprietary assets
- trademarks
- logos
- distinctive visual identity

For each major TEKAD decision, explicitly answer:

"Is this a general engineering pattern/standard, or is this unusually specific to another project?"

If unusually specific, do not reproduce it blindly.

Where a design appears similar to an existing library, document why the TEKAD design is independently justified.

---

# 5. ARCHITECTURE DEEP DIVE

Investigate these areas independently.

## 5.1 Package Architecture

Determine the best architecture for:

- monorepo
- public packages
- secondary entry points
- internal packages
- package export maps
- public API boundaries
- dependency graph
- circular dependency prevention
- build graph
- tree-shaking
- side effects
- ESM
- type declarations

Compare:

- one giant package
- domain packages
- component-per-package
- secondary entry points
- hybrid package topology

Recommend one.

Do not optimize for maximum package count.

Optimize for:

- developer ergonomics
- bundle size
- maintainability
- dependency clarity
- versioning
- discoverability

---

# 6. REACTIVE ARCHITECTURE

Research Angular's current recommended reactive architecture.

Evaluate:

- Signals
- computed
- effects
- signal inputs/outputs/models
- RxJS interop
- Observable consumption
- async streams
- state ownership
- derived state
- cancellation
- event streams

TEKAD requirement:

ONE SOURCE OF TRUTH.

TWO CONSUMPTION MODELS:

1. Signals
2. Observables/RxJS

Determine the cleanest architecture that avoids duplicate state.

Explicitly identify anti-patterns such as:

- signal ↔ observable ping-pong
- duplicate stores
- unnecessary Subjects
- unnecessary effects
- subscription-heavy local state

---

# 7. COMPOSITION / HEADLESS MODEL

Research the best architecture for:

Primitive
→ Pattern
→ Component
→ Enterprise Component

Investigate:

- headless primitives
- directives
- template APIs
- content projection
- template outlets
- dynamic templates
- render-prop-like approaches available in Angular
- dependency injection
- provider-based customization
- content queries
- signal-based APIs

The result must support:

A. ready-to-use components
B. advanced composition
C. lower-level primitives

Avoid giant components with hundreds of boolean/configuration inputs.

Research how complex components such as tables, menus, dialogs, selects and date pickers can expose composable areas without making APIs painful.

---

# 8. CSS / THEME RESEARCH

Compare:

- CSS custom properties
- SCSS
- CSS layers
- design tokens
- semantic tokens
- component tokens
- generated CSS
- runtime theming
- static theming
- dark mode
- density
- high contrast
- custom branding

Determine the lowest-cost architecture that still provides:

- rich themes
- enterprise customization
- dark mode
- custom branding
- minimal CSS
- predictable specificity
- SSR compatibility

Measure or estimate generated CSS where possible.

---

# 9. ACCESSIBILITY RESEARCH

Use:

- WAI-ARIA Authoring Practices
- WCAG
- Angular accessibility/CDK guidance
- native semantic HTML guidance

Research:

- focus management
- focus traps
- keyboard navigation
- roving tabindex
- aria-activedescendant
- live announcements
- dialogs
- menus
- listboxes
- comboboxes
- tables/grids
- tooltips
- popovers
- overlays
- reduced motion

Determine what TEKAD should build itself and what should be delegated to Angular CDK or another appropriate dependency.

---

# 10. SSR / HYDRATION

Research current Angular SSR/hydration requirements.

Evaluate:

- browser API usage
- hydration-safe overlays
- IDs
- random values
- timestamps
- DOM measurement
- ResizeObserver
- IntersectionObserver
- matchMedia
- document/window access
- event replay where relevant
- hydration mismatch risks

Create explicit architectural rules.

---

# 11. PERFORMANCE RESEARCH

Performance is a first-class requirement.

Research and compare:

- package size
- JavaScript bundle size
- CSS size
- dependency overhead
- runtime initialization
- DOM size
- rendering cost
- change detection
- Signals
- event listeners
- large list performance
- virtual scrolling
- table performance
- memory
- SSR/hydration
- lazy loading
- tree-shaking

Where feasible, create reproducible benchmarks.

Do not make unsupported claims such as "TEKAD is lighter."

Define measurable performance budgets.

---

# 12. FLAGSHIP TABLE / DATA GRID

Deeply research table/data-grid architecture.

Compare how mature libraries handle:

- columns
- templates
- sorting
- filtering
- selection
- pagination
- virtualization
- server-side data
- async data
- loading
- empty state
- errors
- sticky headers
- keyboard navigation
- accessibility
- large datasets
- column resizing
- column reordering
- grouped rows
- expandable rows

Determine whether TEKAD should initially build:

A. table only
B. table + data-grid layers
C. composable table primitives + enterprise grid layer

Recommend the architecture.

Avoid a giant monolithic table.

---

# 13. OPTIONAL INTEGRATIONS

Research optional integrations.

Charts must NOT be a core dependency.

Evaluate:

- Chart.js
- D3
- other relevant open-source chart systems

Determine:

- licensing
- bundle cost
- Angular compatibility
- SSR implications
- API complexity
- wrapper value
- whether TEKAD should provide wrappers or examples only

Recommendation must preserve:

core TEKAD remains chart-free.

---

# 14. DEPENDENCY POLICY

Research how mature libraries manage dependencies.

Define rules for:

- runtime dependencies
- peer dependencies
- optional peer dependencies
- dev dependencies
- package duplication
- version ranges
- security
- abandoned dependencies
- bundle impact

Create a TEKAD dependency admission checklist.

---

# 15. SECURITY / SUPPLY CHAIN

Research best practices for open-source package ecosystems.

Evaluate:

- npm security
- lockfiles
- dependency auditing
- provenance
- SBOM
- package signing where applicable
- release automation
- secrets
- CI permissions
- malicious dependency risks
- XSS
- unsafe HTML
- URL handling
- DOM APIs

Recommend a realistic security baseline for a founder-led project.

Do not overengineer.

---

# 16. LICENSE RESEARCH

Research current licenses of all significant dependencies and reference libraries.

For each:

- project
- package
- license
- version investigated
- whether commercial use is permitted
- attribution requirements
- redistribution requirements
- NOTICE requirements
- modification requirements
- compatibility concerns
- risk level

Investigate Apache-2.0 carefully for TEKAD.

Also distinguish:

- copyright
- license
- trademark
- patents
- contributor rights

This is research, not legal advice.

Flag issues requiring a qualified IP lawyer.

---

# 17. TRADEMARK / BRAND RESEARCH

Research the name:

TEKAD

Investigate:

- obvious software naming conflicts
- existing open-source projects
- npm/package naming conflicts
- GitHub organization/repository conflicts
- domain availability where tools permit
- social handle conflicts where relevant
- trademark databases relevant to intended jurisdictions

Do NOT declare the name legally safe.

Instead classify:

CLEARER
POTENTIAL CONFLICT
HIGHER RISK
REQUIRES PROFESSIONAL SEARCH

Also investigate whether package names should use:

@tekad/...
or
@tekad-ui/...

Recommend the naming architecture.

---

# 18. DEVELOPER EXPERIENCE

Research:

- install flow
- imports
- auto-import/schematics
- documentation
- examples
- IDE discoverability
- typings
- errors
- migration experience
- theming
- customization

Determine the ideal experience for:

BEGINNER:
install → import → use

ADVANCED:
primitive → compose → customize

ENTERPRISE:
theme → tokens → architecture → governance

---

# 19. DOCUMENTATION RESEARCH

Compare documentation approaches.

Evaluate:

- API docs
- live playgrounds
- examples
- accessibility docs
- design guidance
- installation
- recipes
- architecture docs
- search
- versioning
- changelogs
- generated API documentation

Recommend the documentation stack and information architecture.

---

# 20. GOVERNANCE / COMMUNITY

Research mature open-source Angular projects.

Determine:

- contribution model
- maintainership
- PR rules
- issue templates
- release process
- security disclosure
- code of conduct
- DCO vs CLA
- community governance

TEKAD initially remains founder-led.

Recommend the minimum governance necessary at launch.

---

# 21. COMPETITIVE GAP ANALYSIS

After studying the ecosystem, answer:

Where are current libraries strongest?

Where are they weakest?

What developer problems remain underserved?

Where is there room for a lightweight but rich enterprise Angular ecosystem?

Create a gap matrix:

Problem
Existing solutions
Weakness
TEKAD opportunity
Difficulty
Value
Risk

Do not manufacture weaknesses simply to make TEKAD look better.

---

# 22. BUILD / BUY / ADAPT / DEFER MATRIX

For every major subsystem classify:

BUILD
REUSE
WRAP
ADAPT
DEFER
NEVER BUILD

Examples:

Accessibility primitive → likely reuse/build selectively
Chart engine → NEVER BUILD
Overlay → investigate CDK vs custom
Icons → optional
Date utilities → investigate mature dependencies
Virtual scrolling → investigate Angular/CDK
Rich text editor → integration rather than core

Every recommendation needs evidence.

---

# 23. ARCHITECTURAL DECISION SCORE

For major architecture options score:

Performance
Developer Experience
Accessibility
Maintainability
Bundle impact
Complexity
Security
License risk
Community viability
Angular alignment
SSR compatibility
Testing difficulty
Long-term sustainability

Use a 1–10 scale.

Explain the score.

Do not use scores as decoration.

---

# 24. REQUIRED OUTPUT

Produce these documents:

01-executive-summary.md
02-competitive-analysis.md
03-architecture-analysis.md
04-package-and-entrypoint-strategy.md
05-reactive-signals-rxjs-strategy.md
06-composition-and-headless-strategy.md
07-css-theme-design-token-strategy.md
08-accessibility-strategy.md
09-ssr-hydration-strategy.md
10-performance-strategy.md
11-table-data-grid-strategy.md
12-dependency-strategy.md
13-security-supply-chain-strategy.md
14-license-analysis.md
15-trademark-brand-research.md
16-clean-room-ip-guidance.md
17-documentation-dx-strategy.md
18-community-governance-strategy.md
19-build-buy-compose-defer-matrix.md
20-tekad-architecture-decision-records.md
21-risk-register.md
22-final-recommendation.md

---

# 25. FINAL RECOMMENDATION

The final report MUST answer:

1. Should TEKAD proceed?
2. What should TEKAD build first?
3. What should TEKAD explicitly NOT build?
4. What architecture should be adopted?
5. What package topology should be adopted?
6. What reactive architecture should be adopted?
7. What should use Angular CDK?
8. What should remain custom?
9. What dependencies should be allowed?
10. What dependencies should be optional?
11. What are the performance budgets?
12. What are the major legal/IP risks?
13. What are the major technical risks?
14. What is the recommended MVP?
15. What should Phase 2 contain?
16. What decisions are reversible?
17. What decisions become expensive to change later?

---

# 26. RESEARCH QUALITY GATE

Do NOT finish research until:

- all major competitors were investigated
- current licensing was verified
- package architecture was investigated
- tree-shaking was investigated
- performance was investigated
- accessibility was investigated
- SSR/hydration was investigated
- Signals/RxJS architecture was investigated
- package entry points were investigated
- dependency risks were investigated
- IP/licensing boundaries were investigated
- recommendations are backed by evidence
- unknowns are explicitly documented

---

# 27. IMPLEMENTATION HANDOFF

At the end create:

`IMPLEMENTATION_HANDOFF.md`

It must contain only decisions that the implementation agent needs.

Structure:

## NON-NEGOTIABLE DECISIONS

## APPROVED ARCHITECTURE

## APPROVED PACKAGE TOPOLOGY

## APPROVED REACTIVE MODEL

## APPROVED CSS/THEME MODEL

## APPROVED ACCESSIBILITY MODEL

## APPROVED DEPENDENCIES

## OPTIONAL DEPENDENCIES

## FORBIDDEN DEPENDENCIES

## PERFORMANCE BUDGETS

## MVP COMPONENTS

## DEFERRED COMPONENTS

## NEVER-BUILD LIST

## LEGAL/IP WARNINGS

## OPEN QUESTIONS

## FIRST IMPLEMENTATION TASK

The implementation agent should be able to read this document instead
of rereading the entire research corpus.

---

# 28. RESEARCH DISCIPLINE

Do not modify TEKAD implementation code.

Do not create production components.

Do not solve implementation tasks during research.

Do not turn the research into a generic essay.

Produce evidence → analysis → decision.

End with:

RESEARCH COMPLETE
IMPLEMENTATION HANDOFF READY
