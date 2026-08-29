#!/usr/bin/env node
/**
 * Reference tests for tools/lib/color.mjs.
 *
 * A contrast checker with a subtly wrong conversion matrix does not fail
 * loudly — it passes everything and protects nobody, while producing a build
 * log that says accessibility was verified. So the conversions are pinned
 * against values published in the CSS Color 4 specification and the WCAG
 * definition, not against whatever this implementation happens to produce.
 *
 * The last group is the one ADR-007 actually cares about: it demonstrates that
 * equal OKLCH lightness does NOT imply equal contrast, which is why the ramp is
 * generated in OKLCH and then checked in sRGB.
 */
import {
  oklchToHex,
  oklchToSrgb,
  fitToSrgbGamut,
  maxChromaInGamut,
  contrastRatioHex,
  relativeLuminance,
  hexToRgb,
  srgbChannelToLinear,
  linearToSrgbChannel,
} from './color.mjs';

let failed = 0;

/**
 * @param {string} name
 * @param {number} actual
 * @param {number} expected
 * @param {number} tolerance
 */
function near(name, actual, expected, tolerance) {
  const ok = Math.abs(actual - expected) <= tolerance;
  console.log(`${ok ? '✓' : '✗'} ${name}  (got ${actual}, expected ${expected} ±${tolerance})`);
  if (!ok) failed++;
}

/**
 * @param {string} name
 * @param {unknown} actual
 * @param {unknown} expected
 */
function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(
    `${ok ? '✓' : '✗'} ${name}  (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`,
  );
  if (!ok) failed++;
}

console.log('— sRGB transfer function —');
// The two published break-point constants, and the round trip.
near('linear→srgb(0) = 0', linearToSrgbChannel(0), 0, 1e-12);
near('linear→srgb(1) = 1', linearToSrgbChannel(1), 1, 1e-12);
near('srgb→linear(1) = 1', srgbChannelToLinear(1), 1, 1e-12);
near('round trip at 0.5', srgbChannelToLinear(linearToSrgbChannel(0.5)), 0.5, 1e-9);

console.log('\n— WCAG relative luminance (defined values) —');
near('white = 1.0', relativeLuminance([255, 255, 255]), 1, 1e-9);
near('black = 0.0', relativeLuminance([0, 0, 0]), 0, 1e-9);
// The WCAG coefficients themselves: pure primaries at full intensity.
near('pure red = 0.2126', relativeLuminance([255, 0, 0]), 0.2126, 1e-9);
near('pure green = 0.7152', relativeLuminance([0, 255, 0]), 0.7152, 1e-9);
near('pure blue = 0.0722', relativeLuminance([0, 0, 255]), 0.0722, 1e-9);

console.log('\n— WCAG contrast ratio (defined values) —');
near('white on black = 21:1', contrastRatioHex('#ffffff', '#000000'), 21, 1e-6);
near('white on white = 1:1', contrastRatioHex('#ffffff', '#ffffff'), 1, 1e-9);
near('symmetric (black on white too)', contrastRatioHex('#000000', '#ffffff'), 21, 1e-6);
// #767676 is the canonical "smallest grey that passes AA on white" example.
near('#767676 on white ≈ 4.54:1', contrastRatioHex('#767676', '#ffffff'), 4.54, 0.02);
// #777777 is the well-known one step too light.
near('#777777 on white ≈ 4.48:1 (fails AA)', contrastRatioHex('#777777', '#ffffff'), 4.48, 0.02);

console.log('\n— OKLCH → sRGB (CSS Color 4 reference values) —');
// oklch(0% 0 0) and oklch(100% 0 0) are exactly black and white.
eq('oklch(0 0 0) = #000000', oklchToHex(0, 0, 0), '#000000');
eq('oklch(1 0 0) = #ffffff', oklchToHex(1, 0, 0), '#ffffff');
// Published conversions of the sRGB primaries, per CSS Color 4.
eq('oklch(0.6280 0.2577 29.23) = red', oklchToHex(0.6279554, 0.2576833, 29.2338851), '#ff0000');
eq('oklch(0.8664 0.2948 142.50) = green', oklchToHex(0.8664396, 0.2948272, 142.4953403), '#00ff00');
eq('oklch(0.4520 0.3132 264.05) = blue', oklchToHex(0.4520137, 0.3132143, 264.0520206), '#0000ff');
// Mid grey: zero chroma keeps it neutral.
eq(
  'oklch(0.5 0 0) is neutral grey',
  (() => {
    const [r, g, b] = hexToRgb(oklchToHex(0.5, 0, 0));
    return r === g && g === b;
  })(),
  true,
);

console.log('\n— gamut reporting —');
// A chroma far beyond sRGB must be REPORTED, not silently clamped: a clamped
// colour renders at a different contrast than the one that was computed.
eq('an in-gamut colour reports inGamut', oklchToSrgb(0.6, 0.05, 250).inGamut, true);
eq('an absurd chroma reports out of gamut', oklchToSrgb(0.6, 0.5, 250).inGamut, false);

console.log('\n— the ADR-007 point: OKLCH lightness is NOT WCAG luminance —');
/*
 * The decisive case, found by measurement rather than assumed.
 *
 * Five hues at IDENTICAL OKLCH lightness (0.58) and IDENTICAL chroma (0.12),
 * all inside the sRGB gamut. If OKLCH lightness were WCAG luminance they would
 * all sit at the same contrast against white. Instead they span 4.054 to 4.550
 * — and the WCAG AA threshold of 4.5 falls INSIDE that span, so at one single
 * OKLCH lightness some hues pass and others fail.
 *
 * That is ADR-007 decision 6 in one assertion: generate the ramp in OKLCH,
 * because it is perceptually uniform and good for that; then assert contrast in
 * sRGB, because that is where the accessibility requirement is actually
 * defined. A design system that picks a lightness step and assumes the ratio
 * follows will ship inaccessible colour while believing it proved otherwise.
 *
 * (At low chroma the two spaces nearly agree — the spread at C=0.05 is under
 * 0.1 — which is exactly what makes this trap easy to miss in a muted palette
 * and expensive to discover in a saturated one.)
 */
const SAME_L = 0.58;
const SAME_C = 0.12;
const hues = [30, 100, 145, 250, 320].map((h) => ({
  h,
  hex: oklchToHex(SAME_L, SAME_C, h),
  cr: contrastRatioHex(oklchToHex(SAME_L, SAME_C, h), '#ffffff'),
  inGamut: oklchToSrgb(SAME_L, SAME_C, h).inGamut,
}));
for (const row of hues) {
  console.log(
    `    hue ${String(row.h).padStart(3)}  ${row.hex}  ${row.cr.toFixed(3)}:1 on white  ` +
      `${row.cr >= 4.5 ? 'PASSES AA' : 'FAILS AA'}${row.inGamut ? '' : '  (out of gamut)'}`,
  );
}
eq(
  'every hue in this demonstration is in gamut',
  hues.every((r) => r.inGamut),
  true,
);
eq(
  'at ONE OKLCH lightness, some hues pass WCAG AA and others fail',
  hues.some((r) => r.cr >= 4.5) && hues.some((r) => r.cr < 4.5),
  true,
);
near('hue 30 at L=0.58 clears AA', hues[0]?.cr ?? 0, 4.536, 0.01);
near('hue 145 at the SAME lightness does not', hues[2]?.cr ?? 0, 4.054, 0.01);

console.log('\n— gamut mapping —');
// Yellow runs out of chroma far earlier than blue at the same lightness. If
// these were equal, the search would not be following the real gamut boundary.
const maxYellow = maxChromaInGamut(0.3, 75);
const maxBlue = maxChromaInGamut(0.3, 264);
console.log(
  `    max chroma at L=0.30: hue 75 (yellow) ${maxYellow.toFixed(4)}, hue 264 (blue) ${maxBlue.toFixed(4)}`,
);
eq('the gamut boundary is hue-dependent', maxBlue > maxYellow * 1.5, true);
eq('a fitted colour is in gamut', oklchToSrgb(0.3, maxChromaInGamut(0.3, 75), 75).inGamut, true);
// Fitting must preserve the attributes carrying the design intent.
const fitted = fitToSrgbGamut(0.3, 0.4, 75);
eq('fitting reports that it clamped', fitted.clamped, true);
eq('fitting preserves lightness', fitted.l, 0.3);
eq('fitting preserves hue', fitted.h, 75);
eq('fitting reduced chroma', fitted.c < 0.4, true);
eq('the fitted result is in gamut', oklchToSrgb(fitted.l, fitted.c, fitted.h).inGamut, true);
// An already-fitting colour must pass through untouched.
const untouched = fitToSrgbGamut(0.6, 0.05, 264);
eq('an in-gamut colour is not clamped', untouched.clamped, false);
eq('an in-gamut colour keeps its chroma', untouched.c, 0.05);

if (failed > 0) {
  console.error(
    `\n${failed} colour reference test(s) failed — the contrast gate cannot be trusted.`,
  );
  process.exit(1);
}
console.log('\n✓ Colour conversions match published reference values.');
