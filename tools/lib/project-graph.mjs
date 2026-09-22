/**
 * TEKAD — make the Nx project graph exist before something depends on it.
 *
 * ── Why this is not ceremony ──────────────────────────────────────────────
 *
 * `@nx/enforce-module-boundaries` is layer two of ADR-012's four boundary
 * layers, and it is an ESLint rule — so it runs inside a plain `eslint .`,
 * where nothing has computed the Nx project graph yet. Measured behaviour when
 * the graph is absent:
 *
 *     warning No cached ProjectGraph is available. The rule will be skipped.
 *
 * "Skipped" is a warning, the exit code stays 0, and every boundary assertion
 * in the repository passes because nothing was evaluated. That is the worst
 * failure mode a gate has: indistinguishable from success. CI found it on
 * 2026-09-19, on the first run of the first pull request — the boundary
 * self-test failed, correctly, because it asserts that the ILLEGAL fixture
 * produces a violation, and no rule produces one while it is skipped.
 *
 * The graph is written by any Nx command that builds it (`nx show projects`,
 * `nx affected`, `nx graph`). CI's `nx affected -t lint` supplies it for free,
 * but the root `eslint .` runs first and the gate self-tests run before that,
 * so `tools/ensure-project-graph.mjs` exists to make the order irrelevant.
 *
 * Deliberately a cache-EXISTENCE check with a full warm-up as the fallback,
 * not a careful detection of which file Nx writes: if the shape of
 * `.nx/workspace-data` changes in a future Nx, the worst case is one extra
 * `nx show projects`, not a silently skipped boundary rule.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WORKSPACE_DATA = join(ROOT, '.nx/workspace-data');

/**
 * Files Nx writes once it has computed the project graph. Any one of them
 * means a later `eslint` invocation can read it.
 *
 * @returns {boolean}
 */
export function graphIsCached() {
  if (!existsSync(WORKSPACE_DATA)) return false;
  try {
    return readdirSync(WORKSPACE_DATA).some(
      (name) => name === 'file-map.json' || name === 'nx_files.nxt' || name.endsWith('.db'),
    );
  } catch {
    return false;
  }
}

/**
 * The Nx CLI entry point, read from Nx's own package.json rather than assumed.
 *
 * The last time this path was assumed, the run died with MODULE_NOT_FOUND at
 * the exact moment it was supposed to be preventing a silent skip.
 *
 * @returns {{ command: string, args: string[] }}
 */
function nxCommand() {
  try {
    const raw = readFileSync(join(ROOT, 'node_modules/nx/package.json'), 'utf8');
    const bin = /** @type {{ bin?: Record<string, string> }} */ (JSON.parse(raw)).bin;
    const rel = bin?.['nx'];
    if (rel && existsSync(join(ROOT, 'node_modules/nx', rel))) {
      return { command: process.execPath, args: [join(ROOT, 'node_modules/nx', rel)] };
    }
  } catch {
    /* fall through to the shim */
  }
  return { command: join(ROOT, 'node_modules/.bin/nx'), args: [] };
}

/**
 * Ensure the graph exists, running the cheapest Nx command that produces it.
 *
 * @param {{ force?: boolean }} [options]
 * @returns {{ warmed: boolean, projects: number, detail: string }}
 */
export function ensureProjectGraph(options = {}) {
  if (!options.force && graphIsCached()) {
    return { warmed: false, projects: 0, detail: 'the Nx project graph is already cached' };
  }

  const { command, args } = nxCommand();
  const res = spawnSync(command, [...args, 'show', 'projects'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  if (res.status !== 0) {
    throw new Error(
      'could not compute the Nx project graph, so @nx/enforce-module-boundaries would be ' +
        `SKIPPED rather than passing. \`nx show projects\` exited ${String(res.status)}:\n` +
        out.slice(-1500),
    );
  }

  const projects = out.split('\n').filter((line) => line.trim() !== '').length;
  return { warmed: true, projects, detail: `computed the Nx project graph (${projects} projects)` };
}
