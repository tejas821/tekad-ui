#!/usr/bin/env node
/**
 * TEKAD — compute the Nx project graph before anything lint-based reads it.
 *
 * `@nx/enforce-module-boundaries` prints "No cached ProjectGraph is available.
 * The rule will be skipped." and exits 0 when the graph is absent. On a fresh
 * clone — CI's first step, or any developer's first `pnpm run lint` — that is
 * the state, so the boundary rules would be skipped rather than enforced.
 *
 * This runs as the first command of `pnpm run lint` so that the root
 * `eslint .` is never the invocation that silently skips them. See
 * `tools/lib/project-graph.mjs` for the measurement and the reasoning.
 *
 * Usage: node tools/ensure-project-graph.mjs [--force]
 */
import { ensureProjectGraph } from './lib/project-graph.mjs';

const force = process.argv.includes('--force');

try {
  const { warmed, projects, detail } = ensureProjectGraph({ force });
  console.log(
    warmed
      ? `✓ ${detail} — the boundary rules will be evaluated, not skipped.`
      : `✓ ${detail} (${projects} project(s) would be shown); nothing to do.`,
  );
} catch (e) {
  console.error(`ensure-project-graph: ${String(e instanceof Error ? e.message : e)}`);
  process.exit(1);
}
