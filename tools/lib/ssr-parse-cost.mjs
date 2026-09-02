/**
 * TEKAD — what raw SSR HTML size costs a real parser.
 *
 * Compression answers "what does the consumer download". It says nothing about
 * "what does the consumer's browser then have to do", and raw size is the input
 * to that: the bytes are decompressed before anything parses them, and every
 * attribute becomes a real object in the DOM.
 *
 * This is the only remaining argument for caring that emulated encapsulation
 * adds 246 KB of raw HTML to a 1,000-row table, so it is measured rather than
 * asserted in either direction.
 *
 * ── Why this is DIAGNOSTIC and never a gate ──────────────────────────────
 *
 * ADR-011: "size is the hard gate, runtime perf is tracked but non-blocking —
 * shared CI runners have too much variance for reliable regression gates."
 * That applies here exactly. The median of several runs is reported, and the
 * spread with it, so a reader can see whether the number means anything on the
 * machine it was taken on.
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const RUNS = Number(process.env['TEKAD_PARSE_RUNS'] ?? 7);

/**
 * @param {{name: string, file: string}[]} pages
 * @returns {Promise<{name: string, medianMs: number, spreadMs: number, elements: number, attributes: number}[]>}
 */
export async function parseCost(pages) {
  const exe = process.env['TEKAD_CHROMIUM'] ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : {});

  /** @type {{name: string, medianMs: number, spreadMs: number, elements: number, attributes: number}[]} */
  const results = [];
  try {
    for (const p of pages) {
      /** @type {number[]} */
      const samples = [];
      let elements = 0;
      let attributes = 0;

      for (let i = 0; i < RUNS; i++) {
        // A fresh context per run so no parse benefits from the last one's
        // warm caches or retained DOM.
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(pathToFileURL(p.file).href, { waitUntil: 'load' });
        const stat = await page.evaluate(() => {
          const nav = /** @type {PerformanceNavigationTiming | undefined} */ (
            performance.getEntriesByType('navigation')[0]
          );
          if (!nav) return { ms: -1, elements: 0, attributes: 0 };
          const all = document.querySelectorAll('*');
          let attrs = 0;
          for (const el of all) attrs += el.attributes.length;
          return {
            // responseEnd -> domContentLoadedEventStart is parse plus DOM
            // construction, with the network out of it: the file is local.
            ms: nav.domContentLoadedEventStart - nav.responseEnd,
            elements: all.length,
            attributes: attrs,
          };
        });
        samples.push(stat.ms);
        elements = stat.elements;
        attributes = stat.attributes;
        await context.close();
      }

      samples.sort((a, b) => a - b);
      const mid = Math.floor(samples.length / 2);
      results.push({
        name: p.name,
        medianMs: samples[mid] ?? 0,
        spreadMs: (samples.at(-1) ?? 0) - (samples[0] ?? 0),
        elements,
        attributes,
      });
    }
  } finally {
    await browser.close();
  }
  return results;
}
