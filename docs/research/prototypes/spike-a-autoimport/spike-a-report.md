# Spike A — auto-import and secondary entry points

**Resolves the open question on ADR-004** (entry-point granularity, which was
left *provisional* by the research phase). Run 2026-08-28.
Artifacts: `make-fixture.mjs`, `tsserver-probe.mjs`, `spike-a-results.json`,
`ls-probe.mjs`, `ls-probe-results.json`.

## The concern

`angular/angular#40407` — "VS Code auto-import doesn't identify secondary entry
points" — is a long-standing open issue. The documentation-and-DX research
argued it was in direct tension with TEKAD's many-entry-point packaging: if a
developer cannot get `TekadButton` imported, the first five minutes are lost,
and that is when adoption is decided.

The question splits into two **different code paths**, which the issue conflates:

- **Q1 — TypeScript symbol auto-import.** Does tsserver offer
  `TekadButton` and insert `import { TekadButton } from '@tekad/core/components/button'`?
- **Q2 — Angular Language Service template completion.** Type `<tekad-button>`
  in a template; does the editor offer the component and add it to `imports`?

**Q1 is the workflow that matters.** In standalone Angular you use a component
by adding its class to the `imports` array — which is an ordinary TypeScript
symbol completion. Q2 automates that from the selector side; it is a
convenience layered on top of Q1, not a substitute for it.

## Method

A first attempt drove `ts.createLanguageService` directly and returned nothing
— **including for the control**. That was a probe defect, not a finding: a bare
LanguageService only completes symbols already in the program. The
"import from a package you haven't imported yet" feature is tsserver's
**AutoImportProviderProject**, which scans `package.json` dependencies and
exists only in the tsserver layer.

The probe was rewritten to drive **tsserver over its stdio protocol** — the
same machinery VS Code runs — against a fixture package whose `exports` map
mirrors real ng-packagr output:

```json
"exports": {
  ".":                       { "types": "./types/index.d.ts",  "default": "./fesm2022/core.mjs" },
  "./components/button":     { "types": "./types/button.d.ts", "default": "./fesm2022/button.mjs" },
  "./components/input":      { "...": "..." },
  "./directives/appearance": { "...": "..." }
}
```

A **control** package exposing only a primary entry point was probed in the same
run. Without it, a negative result would prove nothing.

## Q1 result — **RESOLVED: secondary entry points ARE offered**

TypeScript **6.0.3**:

| Probe | Offered | Source | Import inserted |
|---|---|---|---|
| **Control** (primary entry point only) | ✔ | `@tekad/legacy-single` | `import { TekadControlSymbol } from "@tekad/legacy-single"` |
| **Secondary entry point** | ✔ | `@tekad/core/components/button` | `import { TekadButton } from "@tekad/core/components/button"` |

`probeValid: true` — the control was offered, so the positive result is not an
artefact of a broken harness.

**OBSERVED.** tsserver resolves subpath `exports` for auto-import and inserts
the correct deep specifier.

## Q2 result — **UNVERIFIED**

The Angular Language Service could not be driven in this environment.
`@angular/language-service@22` was installed and tsserver was started with
`--globalPlugins @angular/language-service --pluginProbeLocations <node_modules>
--allowLocalPluginLoads`; the plugin was additionally declared in
`tsconfig.json` and `tsconfig.app.json`.

tsserver itself worked — `projectInfo` resolved the project
(`tsconfig.app.json`, `languageServiceDisabled: false`) and `quickinfo`
correctly returned `class LsConsumer` — but `completionInfo` inside an inline
template returned **zero entries** for both the secondary-entry-point fixture
and the primary-entry-point control. Zero entries for the *control* means the
plugin was not answering, so **no conclusion may be drawn either way**.

This is recorded as an environment limitation, not as evidence about #40407.

## Decision for ADR-004

**Entry-point granularity is no longer blocked.** The concern that motivated
marking it provisional — that a developer could not get the symbol imported —
**does not hold for TypeScript symbol auto-import**, which is the path used
when adding a standalone component to `imports: [...]`.

The two-level, category-prefixed entry-point topology stands:

```
@tekad/core/components/button
@tekad/core/directives/appearance
@tekad/<pattern>/testing
```

**Residual risk, tracked not dismissed:** the selector-driven template
convenience (Q2) is unverified. If it turns out not to work with secondary
entry points, the consequence is a *degraded convenience*, not a broken
workflow — the developer types the class name in `imports` and gets the
correct deep import. Verify Q2 in a real VS Code / WebStorm session before
publishing DX documentation that promises it.

## Reproducing

The fixture is generated rather than committed, so this directory carries no
`node_modules/` tree. `make-fixture.mjs` writes exactly the tree the recorded
run was executed against; the line/offset positions in `src/app.ts` are
load-bearing for the probe.

```bash
npm i typescript@6.0.3          # the version under test
node make-fixture.mjs           # writes ./fixture
node tsserver-probe.mjs         # Q1 — decisive
node ls-probe.mjs               # Q2 — returns PROBE INVALID in this environment
```

The generator was verified by regenerating the fixture over the original tree
(differences were JSON whitespace only) and re-running `tsserver-probe.mjs`
against the regenerated tree, which reproduced `probeValid: true` and the same
verdict.

`ls-probe.mjs` additionally requires `@angular/language-service@22` and
`@angular/core@22`, and expects an Angular project (`tsconfig.app.json`) in its
own directory — it was run from the P1 grid probe workspace, not from here.
