#!/usr/bin/env node
/**
 * TEKAD CI gate 11 — tree-shaking probe.
 *
 * ADR-004's standing rule: "Tree-shaking is verified by a CI probe app, never
 * assumed." Spike B measured that the mechanism *can* work for one symbol in
 * one app. That is not the same as it holding for TEKAD's real package graph,
 * where DI tokens, module-level side effects and `providedIn: 'root'` services
 * are what actually defeat it. This is the gate that keeps measuring.
 *
 * ── How presence is detected ──────────────────────────────────────────────
 *
 * Not by grepping the bundle. Two candidate signals were tried against a real
 * production build first:
 *
 *   Identifier names — USELESS. `TEKAD_VERSION` is minified away whether or not
 *   the module survived, so its absence proves nothing.
 *
 *   String literals (component selectors) — WORKS, but only for code that
 *   happens to contain a distinctive string, which would push authors into
 *   planting markers in production code to keep this gate working.
 *
 *   SOURCE MAP `sources` — WORKS FOR EVERYTHING. A production build with
 *   sourcemaps lists exactly which source files contributed mappings to the
 *   emitted chunks. A module that was fully tree-shaken contributes none and
 *   does not appear. It is name-independent, minifier-independent, and needs no
 *   instrumentation in the library.
 *
 * ── Why each scenario has a mustInclude ───────────────────────────────────
 *
 * An absence proves nothing unless the same run proves the signal can show a
 * presence. Every scenario therefore asserts in both directions, and a scenario
 * whose `mustInclude` is empty is rejected as malformed.
 *
 * Usage: node tools/verify-treeshaking.mjs
 * Exit 0 = every scenario held. Exit 1 = something leaked, or the probe is
 * not measuring anything.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROBE_MAIN = join(ROOT, 'apps/treeshake-probe/src/main.ts');
const OUT = join(ROOT, 'dist/apps/treeshake-probe/browser');

// Resolve nx rather than assuming a path: pnpm's isolated node_modules puts the
// real package under .pnpm/, and node_modules/nx is a symlink whose internal
// layout is nx's business, not this script's.
const NX_BIN = createRequire(import.meta.url).resolve('nx/bin/nx.js');

/**
 * Entry points this gate knows about, keyed by the source-map path fragment
 * that identifies each one. ng-packagr names each entry point's flattened
 * source after the entry point itself, which is what makes this readable.
 */
const ENTRY_POINTS = {
  '@tekad/core': 'packages/core/src/tekad-core.ts',
  '@tekad/core/primitives/identity':
    'packages/core/primitives/identity/src/tekad-core-primitives-identity.ts',
  '@tekad/core/a11y/live-announcer':
    'packages/core/a11y/live-announcer/src/tekad-core-a11y-live-announcer.ts',
  '@tekad/button': 'packages/button/src/tekad-button.ts',
  '@tekad/overlay': 'packages/overlay/src/tekad-overlay.ts',
  '@tekad/checkbox': 'packages/checkbox/src/tekad-checkbox.ts',
  '@tekad/core/forms/model-control':
    'packages/core/forms/model-control/src/tekad-core-forms-model-control.ts',
  '@tekad/forms': 'packages/forms/src/tekad-forms.ts',
  '@tekad/forms/compat': 'packages/forms/compat/src/tekad-forms-compat.ts',
  '@tekad/core/forms/field-context':
    'packages/core/forms/field-context/src/tekad-core-forms-field-context.ts',
  '@tekad/input': 'packages/input/src/tekad-input.ts',
  '@tekad/form-field': 'packages/form-field/src/tekad-form-field.ts',
};

/**
 * @typedef {{name: string, source: string, mustInclude: string[], mustExclude: string[], why: string}} Scenario
 * @type {Scenario[]}
 */
const SCENARIOS = [
  {
    /*
     * ADR-013's third obligation on Phase 9, in its own words: "a tree-shaking
     * scenario, so `@tekad/forms/compat` is proved not to reach a consumer who
     * only uses signal forms."
     *
     * It is not idle. The adapter pulls in `@angular/forms`'s
     * `ControlValueAccessor` machinery, and the whole reason `[tkCompat]` is
     * opt-in rather than matching `[formControl]` automatically is so that a
     * signal-forms consumer never pays for it. That is a claim about the
     * bundler, so it is measured rather than asserted.
     */
    name: 'a signal-forms control without the compat adapter',
    why:
      'ADR-013 ships Reactive Forms support as a SEPARATE entry point precisely so a ' +
      'consumer using only signal forms does not pay for it. If @tekad/forms/compat ' +
      'reached this bundle, the separation would be organisational rather than real.',
    source: `import { bootstrapApplication } from '@angular/platform-browser';
import { Component, signal } from '@angular/core';
import { TekadCheckbox } from '@tekad/checkbox';

@Component({
  selector: 'tk-probe-root',
  standalone: true,
  imports: [TekadCheckbox],
  template: \`<tk-checkbox [(checked)]="on">probe</tk-checkbox>\`,
})
class ProbeRoot {
  readonly on = signal(false);
}

void bootstrapApplication(ProbeRoot);
`,
    // The checkbox provides TEKAD_MODEL_CONTROL, so the token's entry point is
    // legitimately present — that is the seam, and it is tiny. The ADAPTER is
    // what must not be here.
    mustInclude: ['@tekad/checkbox', '@tekad/core/forms/model-control'],
    mustExclude: ['@tekad/forms/compat', '@tekad/forms', '@tekad/button', '@tekad/core'],
  },
  {
    /*
     * The positive control for the scenario above. Without it, "compat is
     * absent" would also be satisfied by a probe that had stopped resolving
     * @tekad/forms/compat at all.
     */
    name: 'CONTROL: the compat adapter IS present when imported',
    why:
      'An absence proves nothing unless the same run shows the signal can register a ' +
      'presence. This is the scenario that makes the one above mean something.',
    source: `import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TekadCheckbox } from '@tekad/checkbox';
import { TekadCompatAdapter } from '@tekad/forms/compat';

@Component({
  selector: 'tk-probe-root',
  standalone: true,
  imports: [ReactiveFormsModule, TekadCheckbox, TekadCompatAdapter],
  template: \`<tk-checkbox tkCompat [formControl]="c">probe</tk-checkbox>\`,
})
class ProbeRoot {
  readonly c = new FormControl(false);
}

void bootstrapApplication(ProbeRoot);
`,
    mustInclude: ['@tekad/forms/compat', '@tekad/checkbox', '@tekad/core/forms/model-control'],
    mustExclude: ['@tekad/button'],
  },
  {
    name: 'one secondary entry point only',
    why:
      'The core ADR-004 claim: importing `@tekad/core/primitives/identity` must not pull the ' +
      "package's primary entry point, and must not pull a component package.",
    source: `import { uniqueId } from '@tekad/core/primitives/identity';
const el = document.createElement('span');
el.id = uniqueId('probe');
document.body.appendChild(el);
`,
    mustInclude: ['@tekad/core/primitives/identity'],
    mustExclude: ['@tekad/core', '@tekad/button'],
  },
  {
    name: 'one component package only',
    why:
      'Installing one component must not pull the ecosystem. `@tekad/button` legitimately uses ' +
      "the identity primitive, so that entry point is expected — but core's PRIMARY entry point " +
      'is not, and neither is anything else.',
    source: `import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { TekadButton } from '@tekad/button';

@Component({
  selector: 'tk-probe-root',
  standalone: true,
  imports: [TekadButton],
  template: \`<button tkButton>probe</button>\`,
})
class ProbeRoot {}

void bootstrapApplication(ProbeRoot);
`,
    mustInclude: ['@tekad/button', '@tekad/core/primitives/identity'],
    mustExclude: ['@tekad/core'],
  },
  {
    /*
     * Phase 2 recorded that the things which actually defeat tree-shaking — DI
     * tokens evaluated at import time, module-level side effects, and
     * `providedIn: 'root'` services — did not exist in this repo yet, and that
     * the probe must grow a scenario when the first one appears. The live
     * announcer is that first one.
     *
     * `providedIn: 'root'` is tree-shakable BY DESIGN: the injector reference
     * is what retains it, so a service nobody injects is dropped. That is a
     * property of how it is written, not a guarantee of the decorator — an
     * `APP_INITIALIZER`, a module-level `inject()`, or anything that registers
     * itself on import defeats it. Which is exactly why it is measured.
     */
    name: 'a providedIn:root service nobody injects',
    why:
      'The live announcer is the first providedIn:root service in the repo. If merely ' +
      'existing in the package graph pulled it into a bundle, every consumer would pay ' +
      'for a live region they never use.',
    source: `import { uniqueId } from '@tekad/core/primitives/identity';
const el = document.createElement('span');
el.id = uniqueId('probe');
document.body.appendChild(el);
`,
    mustInclude: ['@tekad/core/primitives/identity'],
    mustExclude: [
      '@tekad/core',
      '@tekad/button',
      '@tekad/core/a11y/live-announcer',
      '@tekad/overlay',
    ],
  },
  {
    name: 'the same app that DOES inject it',
    why:
      'The positive control for the scenario above. If importing the announcer did not ' +
      'make it appear, its absence there would prove nothing.',
    source: `import { createApplication } from '@angular/platform-browser';
import { TekadLiveAnnouncer } from '@tekad/core/a11y/live-announcer';

void createApplication().then((app) => {
  app.injector.get(TekadLiveAnnouncer).announce('ready');
});
`,
    mustInclude: ['@tekad/core/a11y/live-announcer'],
    mustExclude: ['@tekad/button'],
  },
  {
    name: 'the primary entry point only',
    why:
      'The positive control for the two scenarios above. If importing `@tekad/core` did not make ' +
      'it appear, its absence elsewhere would prove nothing at all.',
    source: `import { TEKAD_VERSION } from '@tekad/core';
document.body.textContent = TEKAD_VERSION;
`,
    mustInclude: ['@tekad/core'],
    mustExclude: [
      '@tekad/button',
      '@tekad/core/primitives/identity',
      '@tekad/core/a11y/live-announcer',
    ],
  },
];

/** @returns {Set<string>} the entry points that contributed to the built bundle */
function entryPointsInBundle() {
  if (!existsSync(OUT)) throw new Error(`probe output missing: ${OUT}`);
  /** @type {Set<string>} */
  const sources = new Set();
  const maps = readdirSync(OUT).filter((f) => f.endsWith('.js.map'));
  if (maps.length === 0) {
    throw new Error(
      'the probe build produced no source maps. This gate reads them; ' +
        'set sourceMap: true on the treeshake-probe build target.',
    );
  }
  for (const f of maps) {
    /** @type {{sources?: string[]}} */
    const map = JSON.parse(readFileSync(join(OUT, f), 'utf8'));
    for (const s of map.sources ?? []) sources.add(s);
  }
  /** @type {Set<string>} */
  const present = new Set();
  for (const [entryPoint, fragment] of Object.entries(ENTRY_POINTS)) {
    for (const s of sources) {
      if (s.includes(fragment)) present.add(entryPoint);
    }
  }
  return present;
}

const original = readFileSync(PROBE_MAIN, 'utf8');
let failed = 0;

try {
  for (const s of SCENARIOS) {
    if (s.mustInclude.length === 0) {
      console.error(`✗ ${s.name}: malformed — a scenario with no mustInclude proves nothing.`);
      failed++;
      continue;
    }

    writeFileSync(PROBE_MAIN, s.source);
    rmSync(OUT, { recursive: true, force: true });

    const build = spawnSync('node', [NX_BIN, 'build', 'treeshake-probe', '--skip-nx-cache'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    if (build.status !== 0) {
      console.error(`✗ ${s.name}: the probe app failed to build.`);
      console.error((build.stdout ?? '') + (build.stderr ?? ''));
      failed++;
      continue;
    }

    const present = entryPointsInBundle();
    const missing = s.mustInclude.filter((e) => !present.has(e));
    const leaked = s.mustExclude.filter((e) => present.has(e));

    if (missing.length === 0 && leaked.length === 0) {
      console.log(`✓ ${s.name}`);
      console.log(`    present: ${[...present].join(', ') || '(none)'}`);
    } else {
      failed++;
      console.error(`✗ ${s.name}`);
      console.error(`    ${s.why}`);
      console.error(`    present: ${[...present].join(', ') || '(none)'}`);
      if (leaked.length) {
        console.error(`    LEAKED (must be absent): ${leaked.join(', ')}`);
      }
      if (missing.length) {
        console.error(
          `    MISSING (must be present): ${missing.join(', ')} — the probe is not measuring ` +
            'anything, so its negative results are worthless.',
        );
      }
    }
  }
} finally {
  writeFileSync(PROBE_MAIN, original);
}

if (failed > 0) {
  console.error(`\n${failed} tree-shaking scenario(s) failed. See ADR-004.`);
  console.error(
    'A leak usually means module-level side effects, a DI token evaluated at import time,\n' +
      'or a `providedIn: "root"` service reachable from the entry point.',
  );
  process.exit(1);
}

console.log('\n✓ Every entry point tree-shakes as specified, and the probe proved it can');
console.log('  detect a presence in the same run.');
