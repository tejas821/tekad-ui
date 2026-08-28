/**
 * TEKAD Spike A (authoritative) — are SECONDARY ENTRY POINTS offered for
 * auto-import by the SAME machinery VS Code uses?
 *
 * A bare `ts.createLanguageService` only completes symbols already in the
 * program; the "import from a package you have not imported yet" feature is
 * tsserver's AutoImportProviderProject, which scans package.json dependencies.
 * So this drives **tsserver itself** over its stdio protocol — exactly what the
 * editor does.
 *
 * Control: a package with ONLY a primary entry point must be offered. If the
 * control fails, the probe is invalid and a negative result proves nothing.
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, 'fixture');
const FILE = join(ROOT, 'src/app.ts');
const require = createRequire(import.meta.url);
const tsserverPath = require.resolve('typescript/lib/tsserver.js');

const proc = spawn(process.execPath, [tsserverPath, '--disableAutomaticTypingAcquisition'],
                   { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });

let seq = 0;
const pending = new Map();
let buffer = '';

proc.stdout.on('data', chunk => {
  buffer += chunk.toString('utf8');
  // tsserver frames each message with a Content-Length header
  for (;;) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;
    const header = buffer.slice(0, headerEnd);
    const m = /Content-Length: (\d+)/i.exec(header);
    if (!m) { buffer = buffer.slice(headerEnd + 4); continue; }
    const len = parseInt(m[1], 10);
    const start = headerEnd + 4;
    if (buffer.length < start + len) break;
    const body = buffer.slice(start, start + len);
    buffer = buffer.slice(start + len);
    try {
      const msg = JSON.parse(body);
      if (msg.type === 'response' && pending.has(msg.request_seq)) {
        pending.get(msg.request_seq)(msg);
        pending.delete(msg.request_seq);
      }
    } catch { /* ignore non-JSON frames */ }
  }
});

function send(command, args, expectResponse = true) {
  const id = ++seq;
  const payload = JSON.stringify({ seq: id, type: 'request', command, arguments: args });
  proc.stdin.write(payload + '\n');
  if (!expectResponse) return Promise.resolve(null);
  return new Promise((resolve) => {
    pending.set(id, resolve);
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); resolve(null); } }, 20000);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Position: 1-based line/offset just after the identifier on the given line. */
async function completionsFor(symbol, lineNo) {
  const res = await send('completionInfo', {
    file: FILE,
    line: lineNo,
    offset: 13 + symbol.length,          // "  const X = " is 12 chars before the symbol
    includeExternalModuleExports: true,
    includeInsertTextCompletions: true,
    triggerKind: 1,
  });
  const entries = res?.body?.entries ?? [];
  const matches = entries.filter(e => e.name === symbol);
  const details = [];
  for (const m of matches.slice(0, 4)) {
    const d = await send('completionEntryDetails', {
      file: FILE, line: lineNo, offset: 13 + symbol.length,
      entryNames: [{ name: m.name, source: m.source, data: m.data }],
    });
    for (const item of d?.body ?? [])
      for (const a of item.codeActions ?? [])
        for (const ch of a.changes ?? [])
          for (const tc of ch.textChanges ?? []) details.push(tc.newText.trim());
  }
  return {
    totalEntries: entries.length,
    offered: matches.length > 0,
    sources: [...new Set(matches.map(m => m.source).filter(Boolean))],
    importsThatWouldBeInserted: [...new Set(details)],
  };
}

await send('configure', {
  preferences: {
    includeCompletionsForModuleExports: true,
    includeCompletionsForImportStatements: true,
    includeCompletionsWithInsertText: true,
    allowIncompleteCompletions: false,
    importModuleSpecifierPreference: 'shortest',
  },
});
await send('open', { file: FILE, projectRootPath: ROOT }, false);
await sleep(4000);   // let tsserver build the auto-import provider project

// src/app.ts:
//   1 export function demo() {
//   2   const a = TekadButton
//   3   const b = TekadControlSymbol
//   4 }
const secondary = await completionsFor('TekadButton', 2);
const control = await completionsFor('TekadControlSymbol', 3);

proc.kill();

const probeValid = control.offered;
const secondaryOffered = secondary.offered
  && (secondary.sources.some(s => s.includes('components/button'))
      || secondary.importsThatWouldBeInserted.some(s => s.includes('components/button')));

const results = {
  question: 'Does tsserver (the machinery VS Code uses) offer auto-import from a package SECONDARY ENTRY POINT?',
  method: 'tsserver stdio protocol; completionInfo with includeExternalModuleExports, then completionEntryDetails to resolve the inserted import',
  control: { symbol: 'TekadControlSymbol', packageShape: 'primary entry point only', ...control },
  secondaryEntryPoint: { symbol: 'TekadButton', packageShape: 'exports map with ./components/button', ...secondary },
  probeValid,
  verdict: !probeValid
    ? 'PROBE INVALID — the control (primary entry point) was not offered either'
    : secondaryOffered
      ? 'SECONDARY ENTRY POINTS ARE OFFERED for auto-import'
      : 'SECONDARY ENTRY POINTS ARE NOT OFFERED for auto-import (control passed, so this is a real negative)',
};
writeFileSync(join(HERE, 'spike-a-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
