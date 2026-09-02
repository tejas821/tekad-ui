/**
 * TEKAD — measuring what view encapsulation costs in SSR HTML.
 *
 * ADR-007 ends with an obligation rather than a decision:
 *
 *   "Emulated-encapsulation SSR cost must be measured before Phase 9 (a 1,000-
 *    row table pays one `_ngcontent` attribute per element)."
 *
 * The parenthesis is true. It is also the half of the story that flatters the
 * conclusion people usually draw from it. `_ngcontent-ng-c488987220=""` is 27
 * bytes, and it is the *same 27 bytes* every time — which is the single easiest
 * input a compressor will ever see. Raw size and transfer size therefore point
 * in different directions here, and a decision made on either one alone is made
 * on half the evidence.
 *
 * So this reports both, plus brotli, and the caller states which one the
 * decision rests on.
 *
 * Kept pure and separate from the rendering so the self-test can run against
 * fixture strings without booting Angular.
 */
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

/**
 * @typedef {object} Measurement
 * @property {string} name
 * @property {number} raw
 * @property {number} gzip
 * @property {number} brotli
 * @property {number} ngcontent   occurrences of the scoping attribute
 * @property {number} nghost      occurrences of the host-scoping attribute
 */

/**
 * @param {string} name
 * @param {string} html
 * @returns {Measurement}
 */
export function measure(name, html) {
  const buf = Buffer.from(html, 'utf8');
  return {
    name,
    raw: buf.byteLength,
    // Level 9 rather than the default 6: a CDN serving pre-compressed assets
    // uses maximum, and the question here is what a consumer actually pays.
    gzip: gzipSync(buf, { level: 9 }).byteLength,
    brotli: brotliCompressSync(buf, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).byteLength,
    ngcontent: count(html, '_ngcontent'),
    nghost: count(html, '_nghost'),
  };
}

/** @param {string} haystack @param {string} needle */
function count(haystack, needle) {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

/**
 * Compare a measurement against the baseline it should be judged by.
 *
 * Returns overhead as a percentage ON TOP OF the baseline, per axis. Expressed
 * that way rather than as "x% smaller" because the two are different numbers
 * and quoting the flattering one is how this kind of measurement gets misused:
 * going from 540 KB to 288 KB is a 47% reduction and an 88% overhead, and only
 * the second answers "what does encapsulation cost me".
 *
 * @param {Measurement} baseline
 * @param {Measurement} subject
 */
export function overhead(baseline, subject) {
  /** @param {number} b @param {number} s */
  const pct = (b, s) => (b === 0 ? Number.POSITIVE_INFINITY : ((s - b) / b) * 100);
  return {
    name: subject.name,
    raw: pct(baseline.raw, subject.raw),
    gzip: pct(baseline.gzip, subject.gzip),
    brotli: pct(baseline.brotli, subject.brotli),
    rawBytes: subject.raw - baseline.raw,
    gzipBytes: subject.gzip - baseline.gzip,
    brotliBytes: subject.brotli - baseline.brotli,
  };
}

/** @param {number} n */
export function kb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}
