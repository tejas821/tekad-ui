# Documentation & Developer-Experience Strategy

Research date 2026-08-26/27.

## What comparable libraries use

- **Angular Material** — a plain Angular CLI app inside the monorepo at
  `/docs`; the standalone `angular/material.angular.io` repo was **archived
  2026-01-04**. Examples are a compiled workspace package
  (`@angular/components-examples`).
- **angular.dev (adev)** — built with Angular, SSG; Markdown guides plus
  **API reference extracted from TypeScript source at build time**.
- **Taiga UI** — Nx demo app on GitHub Pages, Algolia DocSearch.
- **spartan/ui and ng-primitives** — both use **Analog**.

No off-the-shelf SSG (Docusaurus, VitePress, Starlight) renders live Angular
demos natively. That is why every serious Angular library builds its docs in
Angular.

## Recommended stack

- **Analog** (`@analogjs/content` + `@analogjs/router`, Vite, SSG output) —
  the choice of both directly comparable solo/small-team Angular libraries.
  Live Angular components, Markdown authoring, static output.
- **Examples as a compiled workspace library**, imported by the docs app,
  following Material's pattern. Prose references example files by path and
  region marker — **never a hand-written code fence for library API**. Each
  example gets a smoke test (mount + render + axe) under Vitest browser mode
  with Playwright. This is the answer to "examples must not rot" and is the
  highest-value decision in the docs section.
- **Markdown pipeline:** `marked` + `marked-shiki` + `shiki` — no CDN, works
  in SSG.
- **API reference:** start with **Compodoc 2.0.0** (published 2026-06-28, with
  signal-input and standalone support) to get pages on day one; pin it and
  verify against TypeScript 6 before relying on it. Plan to replace it within
  ~6 months with a small in-repo extractor over the TypeScript Compiler API
  emitting JSON the docs app renders — which is what both Angular teams did.
- **Search: Pagefind**, not Algolia. No application, no account, no approval
  delay, and no "must be non-commercial and must not promote a commercial
  product" condition that would collide with a premium-tooling funding path.
  SSG output is exactly what Pagefind indexes.
- **Versioning:** build docs from the release tag, deploy per major under
  `/vN/`. At launch this is only a routing decision — just don't ship URLs
  that cannot take a version segment.
- **`llms.txt` at launch** (about an hour); a component-docs MCP server within
  the first quarter. A meaningful share of "first five minutes" now happens
  inside an AI coding assistant. ng-primitives already ships an MCP server.

## ⚠️ The DX finding that conflicts with the packaging strategy

**`angular/angular#40407` — "VS Code auto-import doesn't identify secondary
entry points" — is a long-standing open issue.**

This is in direct tension with the many-entry-point packaging recommended in
`04-package-and-entrypoint-strategy.md`. If a developer pastes
`<tekad-button>` and the IDE cannot offer the import, the first five minutes
are lost — and that is the moment adoption is decided.

The tree-shaking argument for secondary entry points was much stronger in the
ViewEngine era; with Angular 22, ng-packagr output and modern bundlers doing
per-symbol ESM tree-shaking, it is weaker than it was — though Material's
per-entry-point FESM splitting shows entry points still buy real
publish-time code splitting.

**Options, and the resolution:** (a) single entry point — auto-import works;
(b) single entry point **plus** documented optional deep paths; (c) secondary
entry points only, accepting broken auto-import.

**This must be settled by verification, not preference:** check whether #40407
is fixed in the v21/v22 language service, and test WebStorm separately. Until
then, treat the entry-point granularity in ADR-004 as provisional, and measure
the actual tree-shaking difference between (a) and (c) with the CI probe
before committing.

## Other DX decisions

- **Build `ng add` at launch, and keep it small.** Four things only: install
  the package, add the theme import, wire any required provider into
  `app.config.ts`, print a two-line next step. About a day of work, and it
  converts "read three docs pages and edit two config files" into one command.
  Do **not** build component-generation schematics.
- **Set up `ng update` plumbing at launch** — `"ng-update": {"migrations": …}`
  in `package.json` — even with no migrations to run. Retrofitting it later
  leaves v1→v2 users with no upgrade path. Write the first migration at the
  first breaking change; with `@phenomnomnominal/tsquery` a rename codemod is
  ~50 lines. A young library's biggest adoption objection is "the API will
  churn and I'll be stranded" — a migration for every breaking change answers
  that more credibly than an LTS promise that cannot be kept.
- **Publish a compatibility table on the landing page** (TEKAD ↔ Angular ↔
  TypeScript). It is the first thing an evaluating developer checks, and its
  absence reads as abandonment risk.
- **State honestly what TEKAD is not.** Solo-maintained libraries that
  overpromise get abandoned in evaluation faster than ones that scope tightly.
