# Decision log

Chronological. ADRs hold the reasoning; this file holds _when_ and _why now_.

## 2026-08-26 — Phase 0 executed

- Inspected the repository: research prompts and a README only. No git, no
  `package.json`, no workspace, no source, no CI.
- Verified the Angular v22 platform baseline from primary sources rather than
  assuming it (`angular.dev/reference/versions`, Angular v22 announcement).
- Recorded ADR-000 through ADR-012.
- **Accepted** the decisions the master prompt already settles as
  non-negotiable: Angular 22-first, signals canonical, RxJS as adapter,
  package principles, composition model, never build charts, legacy line
  separated.
- **Refused to accept** decisions the research phase exists to settle
  (accessibility foundation, styling detail, overlay, testing tooling,
  monorepo tooling, concrete package topology). These are marked
  `Proposed — blocked on research` rather than invented — per master prompt
  §47 (no speculative abstraction) and §66 (stop conditions).
- Wrote no code. Phase 0 is documentation and decision scaffolding only.

### Material finding

`@angular/aria` reached production in Angular v22: headless, behaviour-only,
13 WAI-ARIA pattern directives with test harnesses. This overlaps a large part
of TEKAD's intended Pattern layer and may substantially reduce what TEKAD has
to build and maintain. Captured as ADR-005; needs license, bundle, SSR and
coverage verification before acceptance.

### Deliberately deferred

`LICENSE` was **not** created. Apache-2.0 is the stated intent but remains
subject to the legal research pass (`02-LEGAL-IP-RESEARCH-PROMPT.md`).
Committing a license file is a legal act, not a scaffolding step.

## 2026-08-27 — Phase 0.5 research complete

Nine research areas executed across two waves (the first wave-2 attempt was
terminated by a session usage limit and was re-run in smaller batches).
Findings written to `docs/research/` (17 documents) and distilled into
`IMPLEMENTATION_HANDOFF.md`.

**All previously blocked ADRs promoted to Accepted**, with two gated on
prototypes and one left provisional: ADR-005 (adopt `@angular/aria`),
ADR-007 (`@layer` + three token tiers + `light-dark()` + build-time contrast
assertion), ADR-010 (TEKAD-owned hybrid overlay — **gated on P0**),
ADR-011 (Vitest, harnesses as public API, tree-shaking probe),
ADR-012 (Nx 23.1 + pnpm, with conditions), and new ADR-013 (Signal Forms
native, CVA compat as a separate entry point), ADR-014 (four-layer table,
TEKAD owns rendering — **gated on P1**), ADR-015 (Apache-2.0 + DCO),
ADR-016 (`@tekad/*` namespace and publish gates), ADR-017 (Analog docs,
governance, security). ADR-004's entry-point **granularity** was made
provisional on the strength of a contradicting DX finding.

### Findings that changed a decision rather than confirming one

1. **PrimeNG v22 left open source** — commercial licence with key enforcement;
   v21 stays MIT; repo frozen at 21.1.9; an MIT fork appeared within three
   weeks. Reframes the market and makes DCO-over-CLA a positioning decision.
2. **`@angular/aria` peer-pins `@angular/cdk` at an exact version** — "Aria
   instead of CDK" was never an available choice.
3. **`@angular/aria` positions nothing** — TEKAD owns the whole floating layer.
4. **`@angular/cdk/overlay` does not tree-shake** — the minimal import is 98%
   of the full 24.3 KB gzip barrel. Decided ADR-010 against it.
5. **`ngGridCell` throws NG0201 inside `cdk-table`** (#32603) — you cannot have
   both CDK's table and first-party grid a11y. Decided ADR-014.
6. **Angular forbids implementing both CVA and `FormValueControl`** on one
   component — settled a question the master prompt left open (ADR-013).
7. **CSS `overlay` is unsupported in Firefox and Safari** — the largest
   technical risk, and now prototype P0.
8. **`angular/angular#40407` is still open** — secondary entry points break VS
   Code auto-import, contradicting the packaging research. Held as an open
   question rather than resolved by preference.
9. **Nx free remote caching is deprecated over CVE-2025-36852**, whose threat
   model is an OSS repo taking fork PRs.
10. **`github.com/tekad` exists** as a dormant account, and TEKAD is a common
    Indonesian/Malay word with several existing corporate users — trademark is
    classified REQUIRES PROFESSIONAL SEARCH.

Still no code written. That remains correct.

## 2026-08-28 — the four gates close, and no ADR remains provisional

Two prototype gates and two pre-scaffold spikes are complete. All 18 ADRs are
Accepted. Evidence lives in `docs/research/prototypes/`, so the ADRs can cite
artifacts rather than a conversation.

### Findings that changed a decision rather than confirming one

11. **Native CSS `overlay` is not author-settable** (MDN) — so it was never a
    candidate foundation, independent of its browser support. P0 locked the
    top-layer substrate + **deferred close as the single exit path**, and
    rejected the progressive-enhancement hybrid: two exit paths, two
    accessibility timing models, no benefit.
12. **Angular resolves directive DI by the template's DECLARATION site, not its
    DOM insertion point.** This is why `ngGridCell` fails inside `cdk-table`,
    and it produced a new normative requirement in ADR-014: consumer-supplied
    cell templates must be rendered with the row's insertion-site injector.
    Content-projected cells cannot be repaired by an injector at all.
13. **`angular/angular#40407` does not block ADR-004.** Spike A separated two
    code paths the issue conflates. The one that matters — adding a standalone
    component to `imports: [...]`, an ordinary TypeScript symbol completion —
    **works**: tsserver offers the symbol and inserts
    `from "@tekad/core/components/button"`. Entry-point granularity is no
    longer provisional. The selector-driven template path remains UNVERIFIED
    and is a convenience, not the workflow.
14. **Nx 23's own default TypeScript setup is incompatible with Angular.**
    `@nx/angular` generators refuse project references (angular/angular#37276).
    TEKAD scaffolds on the legacy `paths` setup, and TS project references are
    foreclosed as a build-speed lever. This was found by trying, not by reading
    documentation.
15. **`create-nx-workspace --preset=angular-monorepo` ignores its own flags** —
    it now resolves to a fixed GitHub template. The convenient scaffold is not
    available; Phase 1 builds from an empty workspace.
16. **Correction to a Phase 0.5 finding.** "Stock ng-packagr does not produce
    Material's shared-chunk splitting" was misleading. It emits no shared
    _chunk files_, but it does not duplicate either: each secondary FESM keeps
    a bare unresolved package-name import, and deduplication is deferred to the
    consumer's bundler. Measured, with a passing positive control, so the
    outcome that matters holds.

### One decision deliberately NOT made

Spike B measured tree-shaking for a single ballast symbol in a single app and
it passed. ADR-004's **CI tree-shaking probe app requirement stands unchanged**.
Knowing a mechanism can work is not knowing it holds for a package graph
containing DI tokens, module-level side effects and `providedIn: 'root'`
services — which are the things that actually defeat tree-shaking.

Phase 1 begins. Code starts now, for the first time.

## 2026-09-19 — packaging proof

17. **Gate 9b: what a consumer receives, not what the build directory holds.**
    The tarball is the only artefact `.npmignore`, the `files` field and the
    `exports` map all apply to. Measured on its first run: `@tekad/theme` shipped
    `styles/tekad.css` — the file that package exists to provide — and its own
    `exports` map refused every import of it. `dist/` looked perfect.
18. **Per-entry size budgets are measured on the packed tarball, not with
    `size-limit`** (ADR-011, dated correction). `size-limit` reports a synthetic
    esbuild bundle: a different artefact, through a dependency, whose number
    moves when esbuild changes. TEKAD measures the download itself, raw/gzip 9/
    brotli 11, with no dependency added. The hard budget the ADR required is
    unchanged; only the instrument is.
19. **A tarball reader that skips what it does not understand is not a reader.**
    `tools/lib/tarball.mjs` throws on an unknown header type, a checksum that
    does not match, or a symlink — and asserts its own file list against npm's
    report — because a skipped entry is a shipped file no gate ever sees. This
    is the same rule as the gate self-tests, applied to a parser.
20. **Test `include` globs are one per top-level directory under the package**
    (`../forms/**/*.spec.ts`), not one per entry point. Both work; this one means
    a second entry point under the same category needs no `project.json` edit,
    which is one fewer place to forget. The two-level depth limit and the
    package scope are asserted by the generator's own tests.
21. **`format:check` was red at HEAD and that is fixed forward, not ignored.**
    Fifty-one files — mostly documentation written before the formatter was
    wired — had never been formatted, so CI gate 2 could not pass. Widening
    `.prettierignore` would have been the same move as deleting a mutant: the
    gate would have gone quiet without becoming true.
