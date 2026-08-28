/**
 * TEKAD Spike A — regenerate the probe fixture.
 *
 * The fixture is generated rather than committed so the artifact carries no
 * `node_modules/` tree. Running this file recreates exactly the tree that
 * `tsserver-probe.mjs` was executed against.
 *
 *   node make-fixture.mjs        # writes ./fixture
 *
 * `@tekad/core` mirrors the shape ng-packagr emits for a package with
 * secondary entry points (Angular Package Format): an `exports` map whose
 * subpath keys each point at their own `.d.ts`.
 *
 * `@tekad/legacy-single` is the CONTROL: a package with only a primary entry
 * point. If tsserver does not offer the control either, the probe is invalid
 * and a negative secondary-entry-point result proves nothing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, 'fixture');
const NM = join(ROOT, 'node_modules');

const write = (rel, body) => {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body, null, 2) + '\n');
};

/* -------------------------- the consuming project ------------------------- */
write('package.json', {
  name: 'tekad-autoimport-fixture',
  version: '0.0.0',
  private: true,
  type: 'module',
  dependencies: { '@tekad/core': '0.0.1', '@tekad/legacy-single': '0.0.1' },
});

write('tsconfig.json', {
  compilerOptions: {
    target: 'ES2022',
    module: 'preserve',
    moduleResolution: 'bundler',
    strict: true,
    skipLibCheck: true,
    types: [],
  },
  include: ['src/**/*.ts'],
});

// Line/offset positions are load-bearing: tsserver-probe.mjs asks for
// completions at line 2 (TekadButton) and line 3 (TekadControlSymbol).
write('src/app.ts', `export function demo() {
  const a = TekadButton
  const b = TekadControlSymbol
}
`);

/* ------- @tekad/core: secondary entry points via an exports map ----------- */
const core = join('node_modules/@tekad/core');
write(join(core, 'package.json'), {
  name: '@tekad/core',
  version: '0.0.1',
  type: 'module',
  sideEffects: false,
  module: './fesm2022/core.mjs',
  types: './types/index.d.ts',
  exports: {
    './package.json': { default: './package.json' },
    '.': { types: './types/index.d.ts', default: './fesm2022/core.mjs' },
    './components/button': { types: './types/button.d.ts', default: './fesm2022/button.mjs' },
    './components/input': { types: './types/input.d.ts', default: './fesm2022/input.mjs' },
    './directives/appearance': { types: './types/appearance.d.ts', default: './fesm2022/appearance.mjs' },
  },
});
write(join(core, 'types/index.d.ts'), 'export declare const TEKAD_VERSION: string;\n');
write(join(core, 'types/button.d.ts'),
  'export declare class TekadButton { label: string; }\n'
  + 'export declare function makeTekadButton(): TekadButton;\n');
write(join(core, 'types/input.d.ts'), 'export declare class TekadInput { value: string; }\n');
write(join(core, 'types/appearance.d.ts'), 'export declare class TekadAppearance { variant: string; }\n');

/* ---------------- @tekad/legacy-single: the CONTROL ----------------------- */
const legacy = join('node_modules/@tekad/legacy-single');
write(join(legacy, 'package.json'), {
  name: '@tekad/legacy-single',
  version: '0.0.1',
  type: 'module',
  types: './types/index.d.ts',
  exports: { '.': { types: './types/index.d.ts', default: './index.mjs' } },
});
write(join(legacy, 'types/index.d.ts'), 'export declare class TekadControlSymbol { ok: boolean; }\n');

console.log('fixture written to ' + ROOT);
console.log('NOTE: tsserver-probe.mjs resolves `typescript` from its own node_modules.');
console.log('      Install the TypeScript version under test before running the probe.');
void NM;
