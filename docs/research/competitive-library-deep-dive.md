# Competitive Library Deep Dive

Research date: 2026-08-26. Primary sources: npm registry metadata, unpacked
published tarballs, official docs and repositories. Clean-room: architecture
and packaging facts only — no source, API or documentation wording copied.

## Comparison matrix

| Library                     | Architecture                   | Packaging                                                                 | Reactive model                                     | Styling                                                              | A11y                                                             | SSR                                                 | Performance                                    | DX                            | License                                | Key strength                                                    | Key weakness                                                    | TEKAD lesson                                                 |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- | ----------------------------- | -------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| **Angular Material 22.1.4** | Styled suite over CDK          | 1 pkg, 86 export keys, per-entry FESM + shared chunks                     | Decorator-based public API; signals internal only  | SCSS authored → CSS custom properties; `light-dark()`; density -5..0 | Strong; built on CDK a11y                                        | Verified via universal-app target                   | M3 prebuilt theme **7.4 KB** vs M2 **~108 KB** | Mature, huge surface          | MIT                                    | Per-entry-point code splitting at publish time                  | Three reactive generations coexist in one repo                  | Split FESM per entry point; token layer collapses CSS ~15×   |
| **Angular CDK 22.1.4**      | Infrastructure                 | 1 pkg, ~36 export keys                                                    | Decorator-based; zero signal inputs                | Opt-in prebuilt CSS files                                            | `a11y` = key managers, focus trap, LiveAnnouncer, `_IdGenerator` | `afterNextRender` + `isBrowser` guards              | overlay ≈ **24 KB gzip, does not tree-shake**  | Battle-tested                 | MIT                                    | Overlay now uses Popover API by default                         | Pre-`inert` sentinel focus traps; aria-hidden juggling          | Reuse for infra; do not inherit its a11y internals wholesale |
| **@angular/aria 22.x**      | Headless WAI-ARIA patterns     | 1 pkg, 9 runtime + 8 testing entry points                                 | **Fully signal-based** (`input`, `model`)          | **Ships zero CSS**                                                   | 12 documented patterns, 13 directives, harnesses                 | No DOM globals; `afterRenderEffect`, `_IdGenerator` | 10–35 KB raw per pattern                       | Directives on your own markup | MIT                                    | Pattern-core / thin-directive split                             | **Exact-pins `@angular/cdk`**; no overlay, dialog, tooltip      | Adopt for patterns; own the floating layer                   |
| **Taiga UI 5.21.0**         | Full suite                     | ~16 pkgs, `kit` 102 / `core` 51 entry points, **category-prefixed paths** | Signal-migrated public API (112 `input()` in core) | **LESS**; tokens in separately versioned pkg (0.316.0)               | Own implementation; modest ARIA density                          | DI tokens for all browser globals                   | core tarball 251 KB; all OnPush                | Nx + ng-packagr               | Apache-2.0                             | Two-level entry-point namespace; independently versioned tokens | CI pins Angular 19 — **v22 unverified**; mandatory `<tui-root>` | Category-prefixed entry points; never require a root wrapper |
| **PrimeNG 22.1.0**          | Full suite                     | 1 pkg, 284 entry points, compiled-only, **no source**                     | RxJS peer; signals status unknown                  | Best-in-class 3-tier tokens, `--p-` prefix, 4 presets                | Targets WCAG AA                                                  | Unknown                                             | `sideEffects:false`, granular                  | Vast but config-heavy         | **Commercial "PrimeUI" + licence key** | Token architecture                                              | **No longer open source at v22**                                | Copy the token tiers; never the licence model                |
| **Optimus UI 2.0.1**        | PrimeNG v21 fork               | 1 pkg, 264 entry points                                                   | Inherited                                          | Aura/Material/Lara/Nora presets                                      | Claimed                                                          | Unknown                                             | Inherited                                      | Familiar                      | MIT                                    | MIT escape hatch, already on Angular 22                         | ~1 month old, unproven governance                               | Licence changes produce forks within weeks                   |
| **NG-ZORRO 22.0.1**         | Full suite (Ant Design)        | 1 pkg, 185 entry points + Less + prebuilt CSS                             | RxJS; all-OnPush in v22; no signals                | Experimental CSS vars; **Less toolchain required**                   | **Tracking issue #1651 open since 2018**                         | Unknown                                             | Heavy global CSS                               | Familiar to Ant users         | MIT                                    | Design-system fidelity, steady cadence                          | A11y debt; preprocessor as customization path                   | Never make a preprocessor the customization path             |
| **ng-bootstrap 21.0.0**     | Behaviour-only widgets         | 1 pkg, **21 entry points**                                                | RxJS                                               | **None** — Bootstrap 5 CSS is external                               | No stated commitment                                             | `ssr-app` target in repo                            | Tiny surface                                   | Markup-transparent            | MIT                                    | Ruthless scope discipline                                       | No theming; forced `@angular/localize` peer                     | Small scope done well beats breadth                          |
| **Clarity 18.2.1**          | Suite, CSS/behaviour split     | **2 pkgs** (`@clr/ui` + `@clr/angular`), 49 entry points                  | Unknown                                            | Static CSS package, exact-version pinned                             | Claimed; level unverified                                        | Unknown                                             | `sideEffects:false`                            | Slot-composed datagrid/wizard | MIT (+OFL font)                        | CSS/behaviour separation; **DCO**                               | Exact-version lockstep; v22 only by open bound                  | Separate styles from behaviour; state your version support   |
| **Ionic Angular 9.0.0**     | Wrapped web components         | 1 pkg, 107 entry points, **single bundle entry**                          | **`zone.js` hard peer** — not zoneless             | `--ion-*` vars + **stepped tonal ramps** + RGB twins                 | Unknown                                                          | Unknown                                             | Tree-shakes but no route splitting             | Slot-native                   | MIT                                    | Stepped colour ramps                                            | Zone-bound; single entry blocks code splitting                  | Steal stepped ramps; avoid single-entry packaging            |
| **Radix NG 1.1.2**          | Headless primitives            | 1 pkg, 59 entry points, **no CDK**                                        | **Signals-first**                                  | Unstyled; **data-attribute state contract**                          | WAI-ARIA APG stated                                              | Unknown                                             | Minimal runtime                                | `hostDirectives` composition  | MIT                                    | Best composition architecture surveyed                          | Small adoption; upstream realigning to Base UI                  | `[data-*]` state contract + hostDirectives                   |
| **ng-primitives 0.130.1**   | Headless primitives            | 1 pkg, 56 entry points, CDK-based                                         | Directive-based                                    | Unstyled                                                             | WCAG/ARIA emphasis                                               | Unknown                                             | Minimal                                        | Directive composition         | **Apache-2.0**                         | Patent grant; a11y focus                                        | Pre-1.0; largely one maintainer                                 | Apache-2.0 is a procurement advantage                        |
| **Spartan/ui 1.3.3**        | brain (npm) + helm (copied in) | brain 42 entry points; helm **not on npm**                                | Signals-era, CDK-backed                            | Tailwind v4 + **oklch** vars                                         | Via CDK + brain                                                  | Unknown                                             | Tailwind-purged                                | CLI scaffolds into repo       | MIT                                    | Copy-in styles = zero upgrade breakage                          | Tailwind v4 mandatory; no automatic style fixes                 | Consider an optional copy-in styled layer                    |

## The finding that reframes the market

**PrimeNG v22 is no longer open source.** The `LICENSE.md` inside the published
`primeng@22.1.0` tarball is the "PrimeUI License": a commercial licence with a
free Community tier gated on revenue (<$1M), headcount (<10 employees,
<5 developers) and funding (<$3M), and a paid tier at $599/developer rising to
$799 in 2027. **A valid licence key is required to use the software**, verified
offline, with a licence notice displayed when the key is missing or expired.
Redistribution to third-party developers requires a separate OEM licence.

The change is **not retroactive** — `primeng@21.1.9` remains MIT
("PRIMENG COMMUNITY VERSIONS LICENSE / The MIT License (MIT)"). The public
GitHub repository is frozen at 21.1.9; the tag `22.1.0` returns HTTP 404, so
v22+ source is not publicly available.

An MIT fork, `@openng/optimus-ui`, first published 2026-07-21 and reached
Angular 22 parity by 2026-08-20 — roughly three weeks.

**What this means for TEKAD.** The largest "batteries-included" Angular UI
library just left the open-source field, and the ecosystem's response was
immediate and defensive. A genuinely open, permissively licensed, enterprise-
grade Angular UI ecosystem is now an under-served position rather than a
crowded one. It also raises the bar on TEKAD's own credibility: an explicit,
public commitment not to relicense the core is now a differentiator, and the
governance choices that make relicensing _possible_ (notably a CLA with
copyright assignment) are now read by the ecosystem as a risk signal.

## Ideas worth independently adopting

1. **Behaviour core / thin directive split** — `@angular/aria` separates a
   DOM-agnostic, signal-driven pattern state machine from the Angular directive
   that binds it to a host element. Testable without TestBed, reusable by both
   a headless and a styled tier.
2. **Per-entry-point FESM plus shared private chunks** — Material's root bundle
   is 153 bytes because real code lives in per-entry bundles. Code splitting at
   publish time rather than relying on the consumer's bundler.
3. **Category-prefixed, two-level entry points** — `core/components/x`,
   `core/directives/x`, `cdk/utils/x`. Stays navigable past 100 entry points.
4. **Independently versioned design tokens** — Taiga's tokens sit at 0.316.0
   while components are at 5.21.0. Palette iteration costs no component churn.
5. **Token layer instead of per-component compiled CSS** — the measured
   difference is 7.4 KB vs ~108 KB for the same component set.
6. **Theme scoped by attribute on a DOM subtree**, not a root class — allows a
   dark island inside a light page with no cascade tricks.
7. **DI tokens for every browser global**, enforced by lint — one mechanism
   that delivers both SSR safety and test seams.
8. **Data-attribute state contract** (`[data-open]`, `[data-disabled]`) —
   lets any styling strategy hook in without the library shipping opinions.
9. **`hostDirectives` composition** over inheritance or wrapper components.
10. **Test harnesses as part of the public API**, with a pluggable environment.
11. **Runtime `dependencies` limited to `tslib`**; everything else a peer.
12. **Quarantine deprecated APIs into a separate package** rather than letting
    generations coexist in one surface.
13. **Forward-compatible peer ranges** (`^22.0.0 || ^23.0.0`), which prevent
    peer-conflict churn on every Angular major.

## Anti-patterns to avoid

- Two reactive generations in one public API surface.
- A mandatory root wrapper component.
- A preprocessor (LESS/SCSS) as the consumer's customization path.
- A single bundle entry point that blocks route-level code splitting.
- Zone dependence.
- Deferring accessibility to a roadmap milestone.
- Exact-pinned cross-package peers before release automation is proven.
- Gating the core behind a licence.

## Must not be copied

Material Design semantics, `--mat-sys-*` token names, the theming mixin shape,
the density scale; Ant Design's visual language and `nz`-prefixed naming;
Bootstrap's class/markup contract; Clarity's OFL font; PrimeNG/Optimus preset
names and token values, and any PrimeUI licence wording. Clean-room the
architecture, never the tokens, wording or marks.
