# TEKAD — Competitive Architecture Research Prompt

## Objective

Perform a forensic but clean-room architectural study of modern Angular UI ecosystems.

Primary targets:

- Angular Material / CDK
- Taiga UI
- PrimeNG
- NG-ZORRO
- NG Bootstrap
- Ionic Angular where relevant
- Clarity where relevant
- other currently maintained Angular UI systems discovered during research

## Rules

Use official documentation, repositories, package metadata, release notes and licenses first.

Do not copy source code, distinctive APIs, documentation or visual identity.

The purpose is to learn engineering patterns and independently design TEKAD.

## Investigate

For every library:

### Repository
- monorepo or multi-repo
- workspace tooling
- folder structure
- package boundaries
- build tooling
- test tooling
- docs tooling

### Package architecture
- primary package
- secondary entry points
- package-per-domain
- package-per-component
- internal/private packages
- exports
- dependency graph
- tree-shaking
- ESM
- side effects

### Runtime architecture
- change detection
- Signals
- RxJS
- services
- DI
- state
- event handling
- overlays
- dynamic templates
- portals
- DOM utilities

### Component architecture
- standalone
- modules
- composition
- content projection
- templates
- directives
- primitives
- headless behavior
- configuration objects
- provider configuration

### Styling
- CSS
- SCSS
- CSS variables
- tokens
- themes
- dark mode
- generated CSS
- specificity
- runtime styling

### Accessibility
- CDK usage
- ARIA
- keyboard navigation
- focus management
- screen reader behavior
- accessibility testing

### SSR/hydration
- browser API strategy
- hydration behavior
- IDs
- overlays
- DOM measurements
- browser-only services

### Performance
- bundle size
- dependency size
- initialization
- DOM
- rendering
- large tables
- virtualization
- event handling
- CSS size

### Developer experience
- installation
- imports
- auto configuration
- docs
- examples
- API discoverability
- customization
- forms integration

### Governance
- releases
- versioning
- support
- contributions
- security
- maintenance activity

### License/IP
- software license
- commercial restrictions
- attribution
- patents
- trademarks
- contribution terms

## Required output

Create:

`competitive-library-deep-dive.md`

Use a table:

| Library | Architecture | Packaging | Reactive Model | Styling | A11y | SSR | Performance | DX | License | Key Strength | Key Weakness | TEKAD Lesson |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Then provide:

1. best ideas worth independently adopting
2. ideas to avoid
3. patterns that are general standards
4. patterns that appear project-specific
5. areas where TEKAD can differentiate
6. areas where TEKAD should not compete
7. final architectural recommendations

## Important

Do not declare another project "bad" simply because TEKAD chooses a different approach.

Evaluate decisions in their original context.

The output must be evidence-driven.
