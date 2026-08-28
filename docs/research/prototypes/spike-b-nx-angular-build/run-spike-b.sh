#!/usr/bin/env bash
#
# TEKAD Spike B — does @nx/angular@23.1.1 route through the deprecated
# @angular-devkit/build-angular on Angular 22, or through @angular/build?
#
# Resolves the "Open" item on ADR-012. Also measures two things ADR-004 had
# left as assumptions: whether ng-packagr under @nx/angular:package supports
# TEKAD's two-level category-prefixed entry points, and whether importing one
# secondary entry point drags the primary entry point into a consumer bundle.
#
# Everything below is executable and every claim in spike-b-report.md comes
# from a step here. Nothing is inferred from reading source alone.
#
#   bash run-spike-b.sh
#
# Requires: Node >= 22.22.3 (Angular 22's floor) and network access to npm.
# Runs in a scratch directory; touches nothing outside it.
set -euo pipefail

SCRATCH="${SCRATCH:-$(pwd)/ws}"
mkdir -p "$SCRATCH"
cd "$SCRATCH"

say() { printf '\n\033[1m=== %s ===\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
say "STEP 1 — Nx 23.1.1 default (TS-solution) workspace + @nx/angular generator"
# Expected: the generator REFUSES. Angular does not support TS project
# references (angular/angular#37276). This is a Phase 1 scaffolding constraint.
# ---------------------------------------------------------------------------
rm -rf tssolution
npx --yes create-nx-workspace@23.1.1 tssolution \
  --preset=apps --workspaceType=integrated \
  --packageManager=npm --nxCloud=skip --no-interactive >/dev/null
(
  cd tssolution
  echo "composite: $(node -p "require('./tsconfig.base.json').compilerOptions.composite")"
  echo "workspaces: $(node -p "JSON.stringify(require('./package.json').workspaces)")"
  npx nx g @nx/angular:library packages/probelib --name=probelib --publishable \
    --importPath=@tekad-probe/probelib --unitTestRunner=none --linter=none \
    --skipFormat --no-interactive 2>&1 | grep -i "doesn't support\|project references" || true
)

# ---------------------------------------------------------------------------
say "STEP 2 — the angular-monorepo preset: what does it install and wire up?"
# ---------------------------------------------------------------------------
rm -rf ngws
npx --yes create-nx-workspace@23.1.1 ngws \
  --preset=angular-monorepo --appName=probeapp --style=css --bundler=esbuild \
  --e2eTestRunner=none --unitTestRunner=none \
  --packageManager=npm --nxCloud=skip --no-interactive >/dev/null
cd ngws

echo "--- build-angular declared in package.json?"
node -p "const p=require('./package.json');(p.dependencies?.['@angular-devkit/build-angular'])||(p.devDependencies?.['@angular-devkit/build-angular'])||'NOT DECLARED'"
echo "--- app build/serve/i18n executors:"
find . -maxdepth 3 -name project.json -not -path './node_modules/*' \
  -exec node -p "const p=require('{}');Object.entries(p.targets||{}).map(([k,v])=>'  '+p.name+':'+k+' -> '+(v.executor||'(inferred)')).join('\n')" \; 2>/dev/null

# ---------------------------------------------------------------------------
say "STEP 3 — publishable Angular library generator: which build executor?"
# ---------------------------------------------------------------------------
cp package.json /tmp/pkg-before.json
npx nx g @nx/angular:library libs/probelib --name=probelib --publishable \
  --importPath=@tekad-probe/probelib --unitTestRunner=none --linter=none \
  --skipFormat --no-interactive >/dev/null 2>&1
node -p "'build executor: '+require('./libs/probelib/project.json').targets.build.executor"
echo "--- dependencies the generator added:"
node -e "
const a=require('/tmp/pkg-before.json'), b=require('./package.json');
const f=p=>({...p.dependencies,...p.devDependencies}); const A=f(a),B=f(b);
for (const k of Object.keys(B)) if(!(k in A)) console.log('  ADDED', k, B[k]);
"

# ---------------------------------------------------------------------------
say "STEP 4 — TEKAD's two-level, category-prefixed secondary entry point"
# ADR-004 topology: @tekad/core/components/button — two path segments.
# ---------------------------------------------------------------------------
mkdir -p libs/probelib/components/input/src/lib libs/probelib/src/lib/shared
echo '{ "lib": { "entryFile": "src/index.ts" } }' > libs/probelib/components/input/ng-package.json
echo "export * from './lib/input';" > libs/probelib/components/input/src/index.ts
cat > libs/probelib/src/lib/shared/marker.ts <<'TS'
export const TEKAD_SHARED_MARKER = 'TEKAD_SHARED_MARKER_UNIQUE_STRING_42';
export function sharedHelper(n: number): string {
  return TEKAD_SHARED_MARKER + ':' + String(n * 2);
}
// BALLAST: exported from the PRIMARY entry point, used by nothing a consumer
// of the SECONDARY entry point imports. If it survives into an app bundle, the
// entry-point split buys nothing.
export const TEKAD_BALLAST_MARKER = 'TEKAD_BALLAST_UNIQUE_STRING_9137';
export function ballastNobodyImports(seed: number): string {
  let out = TEKAD_BALLAST_MARKER;
  for (let i = 0; i < 50; i++) out += ':' + String((seed + i) * 31 % 977);
  return out;
}
TS
echo "export * from './lib/shared/marker';" >> libs/probelib/src/index.ts
cat > libs/probelib/components/input/src/lib/input.ts <<'TS'
import { Component } from '@angular/core';
import { sharedHelper } from '@tekad-probe/probelib';
@Component({
  selector: 'tk-probe-input', standalone: true,
  template: `<input class="tk-probe-input" [attr.data-x]="v" />`,
})
export class ProbeInput { v = sharedHelper(1); }
TS

# ---------------------------------------------------------------------------
say "STEP 5 — DECISIVE: quarantine @angular-devkit/build-angular, then build"
# If either build touches it, the build fails. Nothing here is inferred.
# ---------------------------------------------------------------------------
rm -rf /tmp/ba-quarantine
if [ -d node_modules/@angular-devkit/build-angular ]; then
  mv node_modules/@angular-devkit/build-angular /tmp/ba-quarantine
  echo "quarantined."
else
  echo "not installed."
fi
echo "--- LIBRARY build (@nx/angular:package -> ng-packagr)"
npx nx build probelib --skip-nx-cache 2>&1 | grep -E "Built @|Successfully|Failed|error" || true
echo "--- APP build (@angular/build:application)"
npx nx build shop --skip-nx-cache 2>&1 | grep -E "bundle generation complete|Successfully|Failed|error" || true

echo "--- generated exports map:"
node -p "JSON.stringify(require('./dist/libs/probelib/package.json').exports,null,1)"
echo "--- sideEffects:"
node -p "require('./dist/libs/probelib/package.json').sideEffects"

# ---------------------------------------------------------------------------
say "STEP 6 — is shared code DUPLICATED into each entry-point FESM?"
# ---------------------------------------------------------------------------
for f in dist/libs/probelib/fesm2022/*.mjs; do
  echo "  $f : $(grep -c 'TEKAD_SHARED_MARKER_UNIQUE_STRING_42' "$f" || true) literal occurrence(s)"
done
echo "--- how the secondaries reference the primary:"
grep -h "from '@tekad-probe/probelib'" dist/libs/probelib/fesm2022/*.mjs | sort -u | sed 's/^/  /'

# ---------------------------------------------------------------------------
say "STEP 7 — TREE-SHAKING: consume ONLY the secondary entry point"
# Consume the BUILT package from node_modules, not the source, so the measured
# thing is the published artefact.
# ---------------------------------------------------------------------------
npm i --no-audit --no-fund --save ./dist/libs/probelib >/dev/null 2>&1
node -e "
const fs=require('fs'); const p=JSON.parse(fs.readFileSync('tsconfig.base.json','utf8'));
delete p.compilerOptions.paths['@tekad-probe/probelib'];
delete p.compilerOptions.paths['@tekad-probe/probelib/button'];
fs.writeFileSync('tsconfig.base.json', JSON.stringify(p,null,2));"
cat > apps/shop/src/app/app.ts <<'TS'
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProbeInput } from '@tekad-probe/probelib/components/input';
@Component({
  imports: [RouterModule, ProbeInput], selector: 'app-root',
  templateUrl: './app.html', styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App { protected title = 'Nx Shop Demo'; }
TS
printf '\n<tk-probe-input></tk-probe-input>\n' >> apps/shop/src/app/app.html
npx nx build shop --skip-nx-cache >/dev/null 2>&1
grep -rq "tk-probe-input" dist/apps/shop/browser/ \
  && echo "  component reached the bundle: YES" || echo "  component reached the bundle: NO"
grep -rq "TEKAD_BALLAST_UNIQUE_STRING_9137" dist/apps/shop/browser/ \
  && echo "  unused primary-entry-point ballast: PRESENT (not tree-shaken)" \
  || echo "  unused primary-entry-point ballast: ABSENT (tree-shaken)"

say "STEP 8 — POSITIVE CONTROL for step 7"
# If the ballast does not appear even when explicitly used, step 7 proved nothing.
cat > apps/shop/src/app/app.ts <<'TS'
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProbeInput } from '@tekad-probe/probelib/components/input';
import { ballastNobodyImports } from '@tekad-probe/probelib';
@Component({
  imports: [RouterModule, ProbeInput], selector: 'app-root',
  templateUrl: './app.html', styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App { protected title = ballastNobodyImports(7); }
TS
npx nx build shop --skip-nx-cache >/dev/null 2>&1
grep -rq "TEKAD_BALLAST_UNIQUE_STRING_9137" dist/apps/shop/browser/ \
  && echo "  ballast present when actually used: PROBE VALID" \
  || echo "  ballast absent even when used: PROBE INVALID"

say "STEP 9 — versions actually exercised"
for p in @angular/core @angular/build ng-packagr typescript nx @nx/angular @angular/cli; do
  echo "  $p = $(node -p "try{require('./node_modules/$p/package.json').version}catch(e){'-'}")"
done
echo "  node = $(node -v)"
