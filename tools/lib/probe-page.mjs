/**
 * TEKAD — serving a built probe app to a real browser.
 *
 * Extracted when the checkbox needed the same thing the button already had.
 * Two copies of a static file server and a Playwright launch is two places for
 * the `readFileSync`-before-`writeHead` ordering bug to live, and that one has
 * already been written once: reading after the headers are sent turns a missing
 * file into `ERR_HTTP_HEADERS_SENT`, which crashes the gate with an error about
 * headers instead of the file it is actually about.
 *
 * Deliberately NOT a test framework. It serves a directory and hands back a
 * page; every gate keeps its own assertions, its own vocabulary and its own
 * exit code, because a failure should name the component it is about.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

/** @type {Record<string, string>} */
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

/**
 * Serve `dist` on an ephemeral port.
 *
 * @param {string} dist
 * @returns {Promise<{url: string, close: () => void}>}
 */
export async function serve(dist) {
  const server = createServer((req, res) => {
    const name = (req.url ?? '/').split('?')[0]?.replace(/^\//, '') || 'index.html';
    let file = join(dist, name);
    // A single-page app: anything unrecognised is the index, so client routing
    // works and a typo in an asset path is visible as a wrong content type
    // rather than as a blank page.
    if (!existsSync(file)) file = join(dist, 'index.html');

    // Read BEFORE writing the head. A path resolving to a directory throws
    // EISDIR, and doing that after writeHead makes the catch throw
    // ERR_HTTP_HEADERS_SENT on top of it.
    let body;
    try {
      body = readFileSync(file);
    } catch {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(undefined)));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { url: `http://127.0.0.1:${port}/`, close: () => server.close() };
}

/**
 * Launch the pinned Chromium.
 *
 * The path is pinned rather than discovered so a CI image change is a loud
 * failure instead of a silent switch to a different engine — every colour,
 * layout and forced-colors number in these gates is engine-specific.
 */
export function launch() {
  const exe = process.env['TEKAD_CHROMIUM'] ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return chromium.launch(existsSync(exe) ? { executablePath: exe } : {});
}

/**
 * Wait for the probe app to finish bootstrapping.
 *
 * Waits on the flag the probe sets, not on an element. A boot failure then
 * times out here rather than producing a page full of confident measurements
 * of nothing.
 *
 * @param {import('playwright').Page} page
 * @param {string} [flag]
 */
export function ready(page, flag = 'TEKAD_SLICE_READY') {
  return page.waitForFunction(
    (f) => /** @type {Record<string, unknown>} */ (globalThis)[f] === true,
    flag,
    { timeout: 30000 },
  );
}

/**
 * Computed style and box metrics for one `data-probe` element.
 *
 * `__width` and `__height` come from `getBoundingClientRect`, not from the
 * computed `width`/`height`: those report the content box and would under-
 * report a control whose hit target includes its padding and border, which is
 * exactly what WCAG 2.2 SC 2.5.8 is about.
 *
 * @param {import('playwright').Page} page
 * @param {string} probe
 * @param {string[]} props
 * @param {string} [within] optional descendant selector inside the probe element
 */
export function style(page, probe, props, within) {
  return page.evaluate(([p, ps, w]) => {
    const root = document.querySelector(`[data-probe="${p}"]`);
    const el = /** @type {HTMLElement | null} */ (w ? (root?.querySelector(w) ?? null) : root);
    if (!el) return null;
    const cs = getComputedStyle(el);
    /** @type {Record<string, string>} */
    const out = {};
    for (const prop of ps ?? []) out[prop] = cs.getPropertyValue(prop);
    const r = el.getBoundingClientRect();
    out['__width'] = String(r.width);
    out['__height'] = String(r.height);
    return out;
  }, /** @type {[string, string[], string | undefined]} */ ([probe, props, within]));
}
