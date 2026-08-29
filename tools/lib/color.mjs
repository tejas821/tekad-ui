/**
 * Colour conversion and WCAG contrast, for the ADR-007 build-time assertion.
 *
 * ADR-007, decision 6:
 *
 *   "OKLCH `L` is not WCAG relative luminance; generate tones in OKLCH, then
 *    compute WCAG contrast for every semantic pair in both schemes and fail the
 *    build below 4.5:1 / 3:1."
 *
 * That sentence is the whole reason this file exists. OKLCH lightness is
 * perceptual and uniform, which is what makes it good for *generating* a tone
 * ramp. WCAG 2.x contrast is defined on sRGB relative luminance, which is a
 * different quantity computed a different way. Two colours 40 OKLCH-lightness
 * steps apart are not therefore at any particular contrast ratio — so the ramp
 * is generated in OKLCH and then *checked* in sRGB. Conflating the two is the
 * single most common way a design system ships inaccessible colour while
 * believing it has proved otherwise.
 *
 * Every function here is pure and dependency-free. The conversions follow the
 * CSS Color 4 specification, and `tools/lib/color.test.mjs` pins them against
 * published reference values — because a contrast checker with a subtly wrong
 * matrix passes everything and protects nobody.
 */

/* --------------------------------------------------------------------------
 * OKLab / OKLCH → linear sRGB
 *
 * Björn Ottosson's OKLab, as adopted by CSS Color 4. The two matrices below
 * are from the specification; they are not tunable and must not be "cleaned
 * up" — the cube root between them is what makes the space perceptual.
 * ------------------------------------------------------------------------ */

/**
 * @param {number} l OKLab lightness, 0–1
 * @param {number} a OKLab a
 * @param {number} b OKLab b
 * @returns {[number, number, number]} linear-light sRGB, unclamped
 */
export function oklabToLinearSrgb(l, a, b) {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const L = l_ * l_ * l_;
  const M = m_ * m_ * m_;
  const S = s_ * s_ * s_;

  return [
    +4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}

/**
 * OKLCH is OKLab in polar form: chroma and hue instead of a and b.
 * @param {number} l lightness 0–1
 * @param {number} c chroma
 * @param {number} h hue in degrees
 * @returns {[number, number, number]} linear-light sRGB, unclamped
 */
export function oklchToLinearSrgb(l, c, h) {
  const rad = (h * Math.PI) / 180;
  return oklabToLinearSrgb(l, c * Math.cos(rad), c * Math.sin(rad));
}

/**
 * The sRGB transfer function (linear-light → encoded 0–1).
 * @param {number} x
 * @returns {number}
 */
export function linearToSrgbChannel(x) {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  return abs <= 0.0031308 ? 12.92 * x : sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
}

/**
 * The inverse transfer function (encoded 0–1 → linear-light).
 * @param {number} x
 * @returns {number}
 */
export function srgbChannelToLinear(x) {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  return abs <= 0.04045 ? x / 12.92 : sign * Math.pow((abs + 0.055) / 1.055, 2.4);
}

/**
 * @param {number} l lightness 0–1
 * @param {number} c chroma
 * @param {number} h hue in degrees
 * @returns {{ rgb: [number, number, number], inGamut: boolean }}
 *   `rgb` is clamped to 0–255 for output; `inGamut` reports whether clamping
 *   was needed. An out-of-gamut colour is not an error here — but it IS a
 *   colour whose rendered contrast differs from the one that was computed, so
 *   the caller must not silently ignore it.
 */
export function oklchToSrgb(l, c, h) {
  const linear = oklchToLinearSrgb(l, c, h);
  const encoded = linear.map(linearToSrgbChannel);
  const inGamut = encoded.every((v) => v >= -0.00001 && v <= 1.00001);
  const rgb = /** @type {[number, number, number]} */ (
    encoded.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255))
  );
  return { rgb, inGamut };
}

/**
 * @param {number} l
 * @param {number} c
 * @param {number} h
 * @returns {string} `#rrggbb`
 */
export function oklchToHex(l, c, h) {
  const { rgb } = oklchToSrgb(l, c, h);
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {string} hex `#rgb` or `#rrggbb`
 * @returns {[number, number, number]} 0–255
 */
export function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`not a hex colour: ${hex}`);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/* --------------------------------------------------------------------------
 * WCAG 2.x contrast
 *
 * Defined in terms of sRGB relative luminance, NOT any perceptual lightness.
 * WCAG 2.2 keeps the 2.0 definition unchanged. ADR-007 conforms to WCAG 2.2 AA
 * and treats APCA as diagnostics only, so this is the number that gates the
 * build.
 * ------------------------------------------------------------------------ */

/**
 * @param {[number, number, number]} rgb 0–255
 * @returns {number} relative luminance, 0–1
 */
export function relativeLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map((v) => srgbChannelToLinear(v / 255));
  return 0.2126 * (R ?? 0) + 0.7152 * (G ?? 0) + 0.0722 * (B ?? 0);
}

/**
 * WCAG 2.x contrast ratio between two colours. Symmetric, 1–21.
 * @param {[number, number, number]} a rgb 0–255
 * @param {[number, number, number]} b rgb 0–255
 * @returns {number}
 */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
export function contrastRatioHex(hexA, hexB) {
  return contrastRatio(hexToRgb(hexA), hexToRgb(hexB));
}

/** WCAG 2.2 AA thresholds. ADR-007 gates on these exact numbers. */
export const WCAG_AA = {
  /** Body text and any text below 18.66px / 24px bold. */
  normalText: 4.5,
  /** Text at or above 18.66px regular / 14px bold. */
  largeText: 3,
  /** Non-text: UI component boundaries, focus indicators, meaningful graphics. */
  nonText: 3,
};

/* --------------------------------------------------------------------------
 * Gamut mapping
 *
 * A requested chroma is an intent, not a promise: sRGB simply cannot hold high
 * chroma at very light or very dark lightness, and the achievable maximum
 * varies sharply with hue — yellow runs out far earlier than blue.
 *
 * Silently clamping the encoded channels is the wrong fix. Clamping changes the
 * colour, so the contrast the build computed would not be the contrast the
 * browser renders, and the WCAG assertion would be asserting something untrue.
 *
 * Instead the chroma is reduced until the colour fits, keeping lightness and
 * hue — the two attributes that carry the design intent — exactly as authored.
 * This is the standard CSS Color 4 approach, and it means the value that gets
 * emitted is the value that gets checked.
 * ------------------------------------------------------------------------ */

/**
 * The largest chroma that stays inside sRGB at this lightness and hue.
 *
 * Binary search rather than a closed form: the sRGB gamut boundary in OKLCH has
 * no simple analytic description, and 24 iterations resolve it far below one
 * 8-bit step.
 *
 * @param {number} l lightness 0–1
 * @param {number} h hue in degrees
 * @param {number} [ceiling] chroma to search up to
 * @returns {number}
 */
export function maxChromaInGamut(l, h, ceiling = 0.4) {
  if (!oklchToSrgb(l, 0, h).inGamut) return 0; // lightness itself is out of range
  let lo = 0;
  let hi = ceiling;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (oklchToSrgb(l, mid, h).inGamut) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Reduce chroma until the colour fits sRGB, preserving lightness and hue.
 *
 * @param {number} l lightness 0–1
 * @param {number} c requested chroma
 * @param {number} h hue in degrees
 * @returns {{ l: number, c: number, h: number, hex: string, clamped: boolean, requestedChroma: number }}
 */
export function fitToSrgbGamut(l, c, h) {
  if (oklchToSrgb(l, c, h).inGamut) {
    return { l, c, h, hex: oklchToHex(l, c, h), clamped: false, requestedChroma: c };
  }
  const max = maxChromaInGamut(l, h, c);
  return { l, c: max, h, hex: oklchToHex(l, max, h), clamped: true, requestedChroma: c };
}
