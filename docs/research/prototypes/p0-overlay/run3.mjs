/**
 * TEKAD P0 — overlay exit-lifecycle prototype (full matrix).
 *
 * GROUND TRUTH = rendered pixels. An opaque cover at z-index 2147483647 fills
 * the viewport; the overlay's colour can only reach the sampled pixel if the
 * element is genuinely painting in the top layer. Corroborated by
 * getBoundingClientRect() (top layer => containing block is the viewport;
 * demoted => reflows into the ancestor and is clipped) and by the computed
 * value of the CSS `overlay` property.
 *
 * Engines executed: Chromium (Playwright) and WebKitGTK (WebKitWebDriver).
 * Firefox/Gecko is NOT executable in this environment and is reported
 * UNVERIFIED. WebKitGTK evidence is WebKit evidence only - it is NOT Safari
 * certification and says nothing about Gecko.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = 'file://' + join(HERE, 'harness3.html');
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });

const OVERLAY_RGB = [43, 108, 246];    // #2b6cf6 outer overlay
const INNER_RGB   = [242, 176, 30];    // #f2b01e nested inner overlay
const COVER_RGB   = [10, 61, 31];      // #0a3d1f oracle cover
const EXIT_MS = 1200;

/* Full exit lifecycle: first frame, early, intermediate x2, final frame. */
const EXIT_SAMPLES = [0, 150, 400, 750, 1100];
const POST_CLOSE_MS = 1500;             // must be gone by now

const sleep = ms => new Promise(r => setTimeout(r, ms));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function pixelAt(buf, x, y) {
  const png = PNG.sync.read(buf);
  const px = Math.min(Math.max(x, 0), png.width - 1);
  const py = Math.min(Math.max(y, 0), png.height - 1);
  const i = (png.width * py + px) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
}
function classify(rgb, expect = OVERLAY_RGB) {
  const dE = dist(rgb, expect), dC = dist(rgb, COVER_RGB);
  return { rgb, verdict: dE < dC ? 'ON_TOP' : 'COVERED', dExpect: Math.round(dE), dCover: Math.round(dC) };
}

/** One full lifecycle: open -> fully open -> exit frames -> post-close. */
async function lifecycle(drv, { which, variant, ancestor, position, expectRgb = OVERLAY_RGB, tag }) {
  await drv.exec(`window.T.reset()`);
  await drv.exec(`window.T.setup({ancestor:${JSON.stringify(ancestor)},position:${JSON.stringify(position)}})`);
  await sleep(80);

  const pt = JSON.parse(await drv.exec(`JSON.stringify(window.T.expectedPoint(${JSON.stringify(which)}))`));

  // --- phase 1: open
  await drv.exec(`window.T.open(${JSON.stringify(which)}, ${JSON.stringify(variant)})`);
  await sleep(30);
  const opening = classify(pixelAt(await drv.shot(), pt.x, pt.y), expectRgb);

  // --- phase 2: fully open
  await sleep(300);
  const fullyOpenShot = await drv.shot();
  const fullyOpen = classify(pixelAt(fullyOpenShot, pt.x, pt.y), expectRgb);
  const fullyOpenProbe = JSON.parse(await drv.exec(`JSON.stringify(window.T.probe(${JSON.stringify(which)}))`));
  if (tag) writeFileSync(join(SHOTS, `${tag}-open.png`), fullyOpenShot);

  // --- phase 3: exit
  await drv.exec(`window.T.markExitStart()`);
  await drv.exec(`window.T.startExit(${JSON.stringify(which)}, ${JSON.stringify(variant)})`);
  const exitSamples = [];
  let prev = 0;
  for (const t of EXIT_SAMPLES) {
    if (t > prev) { await sleep(t - prev); prev = t; }
    const shot = await drv.shot();
    const px = classify(pixelAt(shot, pt.x, pt.y), expectRgb);
    const pr = JSON.parse(await drv.exec(`JSON.stringify(window.T.probe(${JSON.stringify(which)}))`));
    const elapsedMs = await drv.exec(`window.T.elapsed()`);
    exitSamples.push({
      targetMs: t, elapsedMs, withinTransition: elapsedMs <= EXIT_MS, pixel: px.verdict, rgb: px.rgb,
      positionedAgainstViewport: pr.positionedAgainstViewport,
      fullyOnScreen: pr.fullyOnScreen,
      overlay: pr.overlay, display: pr.display,
      rect: pr.rect,
    });
    if (tag && t === 400) writeFileSync(join(SHOTS, `${tag}-midexit.png`), shot);
  }

  // --- phase 4: finish + verify it actually closed
  if (variant === 'deferred') await drv.exec(`window.T.finishDeferred(${JSON.stringify(which)})`);
  await sleep(POST_CLOSE_MS);
  const afterPx = classify(pixelAt(await drv.shot(), pt.x, pt.y), expectRgb);
  const actuallyClosed = afterPx.verdict === 'COVERED';

  await drv.exec(`window.T.reset()`);

  const inWindow = exitSamples.filter(s => s.withinTransition);
  const heldPixel = inWindow.length > 0 && inWindow.every(s => s.pixel === 'ON_TOP');
  const heldGeometry = inWindow.length > 0 && inWindow.every(s => s.positionedAgainstViewport && s.fullyOnScreen);

  return {
    scenario: `${which}/${variant}/ancestor=${ancestor}/pos=${position}`,
    openedOnTop: opening.verdict === 'ON_TOP',
    fullyOpenOnTop: fullyOpen.verdict === 'ON_TOP' && fullyOpenProbe.positionedAgainstViewport,
    heldTopLayerThroughoutExit: heldPixel && heldGeometry,
    samplesInsideTransitionWindow: inWindow.length,
    pixelOracleHeld: heldPixel,
    geometryOracleHeld: heldGeometry,
    actuallyClosed,
    PASS: fullyOpen.verdict === 'ON_TOP' && heldPixel && heldGeometry && actuallyClosed,
    exitSamples,
  };
}

/** Nested overlays: open outer, open inner, close inner, then close outer. */
async function nested(drv, variant) {
  await drv.exec(`window.T.reset()`);
  await drv.exec(`window.T.setup({ancestor:'transform+overflowhidden',position:'centre'})`);
  await sleep(80);
  const pt = JSON.parse(await drv.exec(`JSON.stringify(window.T.expectedPoint('popover'))`));

  await drv.exec(`window.T.open('popover', ${JSON.stringify(variant)})`);
  await sleep(250);
  const outerOpen = classify(pixelAt(await drv.shot(), pt.x, pt.y), OVERLAY_RGB);

  await drv.exec(`window.T.open('popover2', ${JSON.stringify(variant)})`);
  await sleep(250);
  const innerOpen = classify(pixelAt(await drv.shot(), pt.x, pt.y), INNER_RGB);

  // close inner while outer stays open
  await drv.exec(`window.T.startExit('popover2', ${JSON.stringify(variant)})`);
  const innerExit = [];
  let prev = 0;
  for (const t of [60, 350, 800]) {           // inside the 1200ms transition
    await sleep(t - prev); prev = t;
    innerExit.push({ tMs: t, ...classify(pixelAt(await drv.shot(), pt.x, pt.y), INNER_RGB) });
  }
  if (variant === 'deferred') await drv.exec(`window.T.finishDeferred('popover2')`);
  await sleep(EXIT_MS + 600);                 // let the exit fully complete

  // outer must still be there and still on top
  const outerStillUp = classify(pixelAt(await drv.shot(), pt.x, pt.y), OVERLAY_RGB);

  await drv.exec(`window.T.startExit('popover', ${JSON.stringify(variant)})`);
  const outerExit = [];
  prev = 0;
  for (const t of [60, 350, 800]) {
    await sleep(t - prev); prev = t;
    outerExit.push({ tMs: t, ...classify(pixelAt(await drv.shot(), pt.x, pt.y), OVERLAY_RGB) });
  }
  if (variant === 'deferred') await drv.exec(`window.T.finishDeferred('popover')`);
  await sleep(EXIT_MS + 600);
  const allGone = classify(pixelAt(await drv.shot(), pt.x, pt.y), OVERLAY_RGB).verdict === 'COVERED';
  await drv.exec(`window.T.reset()`);

  return {
    scenario: `nested/${variant}`,
    outerOpenedOnTop: outerOpen.verdict === 'ON_TOP',
    innerStackedAboveOuter: innerOpen.verdict === 'ON_TOP',
    innerHeldDuringExit: innerExit.every(s => s.verdict === 'ON_TOP'),
    outerSurvivedInnerClose: outerStillUp.verdict === 'ON_TOP',
    outerHeldDuringExit: outerExit.every(s => s.verdict === 'ON_TOP'),
    allClosedAtEnd: allGone,
    PASS: outerOpen.verdict === 'ON_TOP' && innerOpen.verdict === 'ON_TOP'
       && innerExit.every(s => s.verdict === 'ON_TOP')
       && outerStillUp.verdict === 'ON_TOP'
       && outerExit.every(s => s.verdict === 'ON_TOP') && allGone,
    innerExit, outerExit,
  };
}

const ANCESTORS = ['none', 'transform', 'overflowhidden', 'overflowclip', 'opacity',
                   'filter', 'containpaint', 'willchange', 'transform+overflowhidden+filter'];

async function runAll(drv) {
  const capabilities = JSON.parse(await drv.exec('JSON.stringify(window.T.capabilities())'));
  const core = [], ancestorSweep = [], edge = [], nestedR = [];

  for (const which of ['popover', 'dialog']) {
    for (const variant of ['naive', 'deferred']) {
      core.push(await lifecycle(drv, {
        which, variant, ancestor: 'transform+overflowhidden+filter', position: 'centre',
        tag: `${drv.tag}-${which}-${variant}`,
      }));
    }
  }
  for (const ancestor of ANCESTORS) {
    for (const variant of ['naive', 'deferred']) {
      ancestorSweep.push(await lifecycle(drv, { which: 'popover', variant, ancestor, position: 'centre' }));
    }
  }
  for (const variant of ['naive', 'deferred']) {
    edge.push(await lifecycle(drv, {
      which: 'popover', variant, ancestor: 'transform+overflowhidden', position: 'edge',
      tag: `${drv.tag}-edge-${variant}`,
    }));
  }
  for (const variant of ['naive', 'deferred']) nestedR.push(await nested(drv, variant));

  return { capabilities, core, ancestorSweep, edge, nested: nestedR };
}

/* ------------------------------ adapters -------------------------------- */
async function chromiumAdapter() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await page.goto(URL_);
  await page.waitForFunction(() => document.title === 'READY');
  return { tag: 'chromium', ua: await page.evaluate(() => navigator.userAgent),
    exec: js => page.evaluate(js), shot: () => page.screenshot(), close: () => browser.close() };
}

const WD = 'http://127.0.0.1:4444';
async function webkitAdapter() {
  const xvfb = spawn('Xvfb', [':99', '-screen', '0', '1280x900x24'], { stdio: 'ignore' });
  const proc = spawn('WebKitWebDriver', ['--port=4444'], { stdio: 'ignore', env: { ...process.env, DISPLAY: ':99' } });
  const rq = async (m, p, b) => {
    const r = await fetch(WD + p, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
    const j = await r.json();
    if (j.value && j.value.error) throw new Error(`${j.value.error}: ${j.value.message}`);
    return j.value;
  };
  for (let i = 0; i < 60; i++) { try { await fetch(WD + '/status'); break; } catch { await sleep(200); } }
  const s = await rq('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'MiniBrowser',
    'webkitgtk:browserOptions': { binary: '/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser', args: ['--automation'] } } } });
  const S = p => `/session/${s.sessionId}${p}`;
  await rq('POST', S('/window/rect'), { width: 900, height: 600, x: 0, y: 0 });
  await rq('POST', S('/url'), { url: URL_ });
  for (let i = 0; i < 60; i++) { if (await rq('GET', S('/title')) === 'READY') break; await sleep(200); }
  return { tag: 'webkitgtk', ua: await rq('POST', S('/execute/sync'), { script: 'return navigator.userAgent', args: [] }),
    exec: js => rq('POST', S('/execute/sync'), { script: `return (${js})`, args: [] }),
    shot: async () => Buffer.from(await rq('GET', S('/screenshot')), 'base64'),
    close: async () => { try { await rq('DELETE', S('')); } catch {} proc.kill(); xvfb.kill(); } };
}

/* --------------------------------- main --------------------------------- */
const out = { generatedAt: new Date().toISOString(), exitDurationMs: EXIT_MS, exitSampleTimesMs: EXIT_SAMPLES, postCloseCheckMs: POST_CLOSE_MS };

const ONLY = process.env.ENGINE;           // run one engine per process (memory)
const ENGINES = [
  ['chromium', chromiumAdapter, 'Chromium (Playwright build 1194, headless)'],
  ['webkitgtk', webkitAdapter, 'WebKitGTK 2.52.3 via WebKitWebDriver — WEBKIT EVIDENCE ONLY, not Safari certification'],
].filter(([k]) => !ONLY || k === ONLY);

// merge with anything already on disk so per-engine runs accumulate
try { Object.assign(out, JSON.parse(readFileSync(join(HERE, 'p0-results.json'), 'utf8'))); } catch {}

for (const [key, make, label] of ENGINES) {
  let drv;
  try { drv = await make(); out[key] = { engine: label, userAgent: drv.ua, ...(await runAll(drv)) }; }
  catch (e) { out[key] = { engine: label, error: String(e.stack || e) }; }
  finally { try { await drv?.close(); } catch {} }
}

out.firefox = {
  engine: 'Firefox / Gecko',
  status: 'UNVERIFIED — no Gecko runtime is obtainable in this environment',
  note: 'WebKitGTK results say nothing about Gecko. No Firefox behaviour is inferred anywhere in this report.',
  routesAttempted: [
    'npx playwright install firefox -> HTTP 403, playwright.download.prss.microsoft.com not on the egress allowlist',
    'ftp.mozilla.org, archive.mozilla.org, download.mozilla.org, releases.mozilla.org, product-details.mozilla.org -> all refused by proxy (000)',
    'packages.mozilla.org apt repository -> blocked',
    'ppa.launchpadcontent.net (mozillateam PPA) and launchpad.net -> blocked',
    'snapcraft.io and api.snapcraft.io -> blocked',
    'apt-get install firefox on Ubuntu 24.04 -> 1:1snap1-0ubuntu5, a snap transitional stub containing no binary',
    'apt-cache search firefox|gecko|xulrunner|iceweasel -> only snap transitional stubs',
    'no pre-existing browser binary on the cloud container',
    "user's device VM via device_bash -> no browser installed; the same Mozilla hosts are blocked there too",
  ],
};

writeFileSync(join(HERE, 'p0-results.json'), JSON.stringify(out, null, 2));

/* -------------------------------- summary -------------------------------- */
const yn = b => b ? 'PASS' : 'FAIL';
for (const k of ENGINES.map(e => e[0])) {
  const e = out[k];
  console.log('\n' + '='.repeat(78) + '\n' + e.engine);
  if (e.error) { console.log('  ERROR: ' + e.error.split('\n')[0]); continue; }
  console.log('  UA: ' + e.userAgent);
  console.log('  caps: ' + JSON.stringify(e.capabilities));
  console.log('\n  -- CORE (worst-case ancestor: transform + overflow:hidden + filter) --');
  for (const r of e.core) console.log(`    ${yn(r.PASS)}  ${r.scenario.padEnd(52)} held=${r.heldTopLayerThroughoutExit} closed=${r.actuallyClosed}`);
  console.log('\n  -- ANCESTOR SWEEP (popover) --');
  for (const r of e.ancestorSweep) console.log(`    ${yn(r.PASS)}  ${r.scenario.padEnd(60)} pixel=${r.pixelOracleHeld} geom=${r.geometryOracleHeld}`);
  console.log('\n  -- VIEWPORT EDGE --');
  for (const r of e.edge) console.log(`    ${yn(r.PASS)}  ${r.scenario}`);
  console.log('\n  -- NESTED OVERLAYS --');
  for (const r of e.nested) console.log(`    ${yn(r.PASS)}  ${r.scenario.padEnd(22)} innerAbove=${r.innerStackedAboveOuter} innerHeld=${r.innerHeldDuringExit} outerSurvived=${r.outerSurvivedInnerClose} outerHeld=${r.outerHeldDuringExit} allClosed=${r.allClosedAtEnd}`);
}
console.log('\nFirefox/Gecko: ' + out.firefox.status);
