/**
 * TEKAD Spike A, part 2 — does the ANGULAR LANGUAGE SERVICE offer a component
 * published from a SECONDARY ENTRY POINT when you type its selector in a
 * template, and does it auto-add the import?
 *
 * This is the code path angular/angular#40407 is actually about, and it is the
 * one that matters for a component library: a developer types `<tekad-button>`
 * and expects the editor to add it to `imports`.
 *
 * Driven through tsserver with @angular/language-service loaded as a plugin —
 * the same arrangement VS Code uses.
 *
 * Control: the same probe is run against a component published from the
 * PRIMARY entry point. If the control is not offered either, the probe is
 * invalid and a negative result proves nothing.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const tsserverPath = require.resolve('typescript/lib/tsserver.js');
const NM = join(HERE, 'node_modules');

/* -- a second fixture component, published from the PRIMARY entry point -- */
mkdirSync(join(NM, '@tekad/ui-primary/types'), { recursive: true });
writeFileSync(join(NM, '@tekad/ui-primary/package.json'), JSON.stringify({
  name: '@tekad/ui-primary', version: '0.0.1', type: 'module', sideEffects: false,
  types: './types/index.d.ts',
  peerDependencies: { '@angular/core': '^22.0.0' },
  exports: { './package.json': { default: './package.json' },
             '.': { types: './types/index.d.ts', default: './fesm2022/ui.mjs' } },
}, null, 2));
writeFileSync(join(NM, '@tekad/ui-primary/types/index.d.ts'), `import * as i0 from '@angular/core';
export declare class TekadPrimaryButton {
    static ɵfac: i0.ɵɵFactoryDeclaration<TekadPrimaryButton, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<TekadPrimaryButton, "tekad-primary-button", never, {}, {}, never, never, true, never>;
}
`);

const proc = spawn(process.execPath, [
  tsserverPath,
  '--globalPlugins', '@angular/language-service',
  '--pluginProbeLocations', NM,
  '--allowLocalPluginLoads',
  '--disableAutomaticTypingAcquisition',
], { cwd: HERE, stdio: ['pipe', 'pipe', 'pipe'] });

let seq = 0; const pending = new Map(); let buffer = '';
const events = [];
proc.stdout.on('data', chunk => {
  buffer += chunk.toString('utf8');
  for (;;) {
    const he = buffer.indexOf('\r\n\r\n'); if (he === -1) break;
    const m = /Content-Length: (\d+)/i.exec(buffer.slice(0, he));
    if (!m) { buffer = buffer.slice(he + 4); continue; }
    const len = +m[1], start = he + 4;
    if (buffer.length < start + len) break;
    const body = buffer.slice(start, start + len); buffer = buffer.slice(start + len);
    try {
      const msg = JSON.parse(body);
      if (msg.type === 'event') events.push(msg.event);
      if (msg.type === 'response' && pending.has(msg.request_seq)) {
        pending.get(msg.request_seq)(msg); pending.delete(msg.request_seq);
      }
    } catch {}
  }
});
const stderr = [];
proc.stderr.on('data', d => stderr.push(d.toString()));

function send(command, args, expect = true) {
  const id = ++seq;
  proc.stdin.write(JSON.stringify({ seq: id, type: 'request', command, arguments: args }) + '\n');
  if (!expect) return Promise.resolve(null);
  return new Promise(res => {
    pending.set(id, res);
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); res(null); } }, 25000);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Ask for completions inside the inline template, right after `<tekad-`. */
async function probeTemplate(file, line, offset, needle) {
  const res = await send('completionInfo', {
    file, line, offset,
    includeExternalModuleExports: true,
    includeInsertTextCompletions: true,
    triggerKind: 1,
  });
  const entries = res?.body?.entries ?? [];
  const matches = entries.filter(e => (e.name || '').includes(needle));
  const inserted = [];
  for (const m of matches.slice(0, 3)) {
    const d = await send('completionEntryDetails', {
      file, line, offset, entryNames: [{ name: m.name, source: m.source, data: m.data }],
    });
    for (const item of d?.body ?? [])
      for (const a of item.codeActions ?? []) {
        inserted.push({ description: a.description });
        for (const ch of a.changes ?? [])
          for (const tc of ch.textChanges ?? []) inserted.push({ newText: tc.newText.trim() });
      }
  }
  return {
    totalEntries: entries.length,
    sampleEntryNames: entries.slice(0, 12).map(e => e.name),
    matched: matches.map(m => ({ name: m.name, kind: m.kind, source: m.source })),
    offered: matches.length > 0,
    codeActions: inserted,
  };
}

await send('configure', { preferences: {
  includeCompletionsForModuleExports: true,
  includeCompletionsWithInsertText: true,
  includeCompletionsForImportStatements: true,
} });

const secondaryFile = join(HERE, 'src/lsprobe/consumer.ts');
const primaryFile = join(HERE, 'src/lsprobe/consumer-primary.ts');
writeFileSync(primaryFile, `import { Component } from '@angular/core';

@Component({
  selector: 'ls-consumer-primary',
  standalone: true,
  imports: [],
  template: \`<tekad-\`,
})
export class LsConsumerPrimary {}
`);

await send('open', { file: secondaryFile, projectRootPath: HERE }, false);
await send('open', { file: primaryFile, projectRootPath: HERE }, false);
await sleep(9000);   // Angular LS needs time to build its program

// Diagnostics: is the file in a real project, and did the plugin attach?
const projInfo = await send('projectInfo', { file: secondaryFile, needFileNameList: false });
const quickInfo = await send('quickinfo', { file: secondaryFile, line: 9, offset: 16 });
console.error('PROJECT:', JSON.stringify(projInfo?.body));
console.error('QUICKINFO(class):', JSON.stringify(quickInfo?.body?.displayString));
console.error('EVENTS:', JSON.stringify([...new Set(events)]));

// line 7 is:   template: `<tekad-`,
// offset is 1-based; place the caret right after the trailing hyphen.
const CARET = 21;   // caret sits AFTER the trailing hyphen (1-based)
const secondary = await probeTemplate(secondaryFile, 7, CARET, 'tekad-button');
const primary = await probeTemplate(primaryFile, 7, CARET, 'tekad-primary-button');

proc.kill();

const pluginLoaded = !stderr.join('').includes('Failed to load module')
  && (secondary.totalEntries > 0 || primary.totalEntries > 0);
const probeValid = primary.offered;

const results = {
  question: 'Does the Angular Language Service offer a component from a SECONDARY entry point in a template, and auto-add the import?',
  method: 'tsserver + @angular/language-service plugin; completionInfo inside an inline template, then completionEntryDetails for the code action',
  angularLanguageServiceLoaded: pluginLoaded,
  control_primaryEntryPoint: primary,
  secondaryEntryPoint: secondary,
  probeValid,
  verdict: !pluginLoaded ? 'PROBE INVALID — the Angular language service plugin did not load'
    : !probeValid ? 'PROBE INVALID — the control (primary entry point) component was not offered either'
    : secondary.offered ? 'SECONDARY ENTRY POINT COMPONENTS ARE OFFERED in templates'
    : 'SECONDARY ENTRY POINT COMPONENTS ARE NOT OFFERED in templates (control passed, so this is a real negative)',
  stderrSample: stderr.join('').slice(0, 600),
};
writeFileSync(join(HERE, 'ls-probe-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
