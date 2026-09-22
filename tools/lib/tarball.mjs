/**
 * TEKAD — read what `npm pack` actually produces.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * Everything TEKAD verified before this file looked at `dist/`. `dist/` is a
 * directory on the build machine; it is not what a consumer receives. Between
 * the two sit `.npmignore`, the `files` field, and whatever the packer decides
 * to include — and on 2026-09-19 that difference turned out to be real:
 * `@tekad/theme` shipped `styles/tekad.css`, the file that package exists to
 * provide, inside the tarball and refused by its own `exports` map. Nothing
 * that inspected `dist/` could have found it, because nothing that inspected
 * `dist/` looked at the tarball from the outside.
 *
 * ADR-011 asks for a "pack → import" proof and ADR-012 names it the fourth
 * boundary layer. This module is the machinery under both, shared by
 * `verify-consumer-boundary.mjs` and `verify-size-budget.mjs` so that the file
 * list, the manifest and the bytes measured are the same bytes.
 *
 * ── Why it is not `tar-stream` or `pacote` ────────────────────────────────
 *
 * Adding a dependency to READ a file whose purpose is to prove what a package
 * depends on is a poor trade, and TEKAD's dependency policy requires every
 * runtime dependency to earn its place. The reader is narrow on purpose: npm
 * writes ustar with a `package/` prefix, plus at most three extension records
 * (GNU long name, pax local, pax global). Anything else throws. A narrow
 * reader that fails loudly beats a general one that silently skips an entry —
 * a skipped entry is a shipped file the gates never see.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brotliCompressSync, constants, gunzipSync, gzipSync } from 'node:zlib';

const BLOCK = 512;
const PREFIX = 'package/';

/**
 * A built package's manifest, as far as these gates read it. Named fields
 * rather than an index signature, because the compiler setting in this repo is
 * `noPropertyAccessFromIndexSignature`: with an index signature, `manifest.type`
 * would be rejected and a typo like `manifest.typ` would be accepted.
 *
 * @typedef {object} BuiltManifest
 * @property {string} [name]
 * @property {string} [version]
 * @property {string} [type]
 * @property {boolean} [private]
 * @property {boolean | string[]} [sideEffects]
 * @property {string} [module]
 * @property {string} [typings]
 * @property {Record<string, unknown>} [exports]
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [peerDependencies]
 * @property {Record<string, string>} [scripts]
 */

/**
 * @typedef {object} TarEntry
 * @property {string} path path inside the archive, with `package/` stripped
 * @property {'file' | 'directory'} type
 * @property {number} size
 * @property {Buffer} [bytes] present for files
 */

/**
 * @typedef {object} PackedPackage
 * @property {string} name
 * @property {string} version
 * @property {string} filename
 * @property {string} tarball absolute path to the `.tgz`
 * @property {Buffer} bytes the `.tgz` itself, byte for byte
 * @property {number} size `bytes.length`, the number a consumer downloads
 * @property {number} unpackedSize what npm reports after extraction
 * @property {{ path: string, size: number }[]} files what npm says it wrote
 * @property {TarEntry[]} entries what the archive actually contains
 * @property {BuiltManifest} manifest the tarball's package.json
 * @property {(path: string) => Buffer} read one shipped file's bytes
 */

/**
 * @param {Buffer} block
 * @param {number} start
 * @param {number} len
 * @returns {number} the octal field, `0` when blank
 */
function octal(block, start, len) {
  const raw = block
    .subarray(start, start + len)
    .toString('utf8')
    .replace(/\0.*$/s, '')
    .trim();
  return raw === '' ? 0 : Number.parseInt(raw, 8);
}

/**
 * @param {Buffer} block
 * @param {number} start
 * @param {number} len
 * @returns {number} the field, base-256 when the high bit says so
 */
function numeric(block, start, len) {
  return (block[start] ?? 0) & 0x80
    ? Number.parseInt(block.subarray(start + 1, start + len).toString('hex'), 16)
    : octal(block, start, len);
}

/**
 * Unpack a gzipped tar archive.
 *
 * @param {Buffer} bytes
 * @returns {TarEntry[]}
 */
export function untar(bytes) {
  const tar = gunzipSync(bytes);
  /** @type {TarEntry[]} */
  const entries = [];
  /** @type {string | null} */
  let gnuLongName = null;
  /** @type {string | null} */
  let paxPath = null;
  let offset = 0;

  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (header.every((b) => b === 0)) break;

    /*
     * The checksum covers the whole header with the checksum field itself read
     * as eight SPACES — what ustar defines and what npm writes. Old tars used
     * NULs; both are accepted here, because rejecting a valid archive would
     * make this reader the failure instead of the guard.
     */
    const stored = octal(header, 148, 8);
    const sum = header.reduce((a, b, i) => (i >= 148 && i < 156 ? a : a + b), 0);
    if (stored !== sum + 8 * 0x20 && stored !== sum) {
      throw new Error(
        `tarball: header checksum mismatch at byte ${offset} ` +
          `(stored ${stored}, computed ${sum + 8 * 0x20}). ` +
          'The archive is not what npm said it wrote.',
      );
    }

    const size = numeric(header, 124, 12);
    const typeflag = String.fromCharCode(header[156] ?? 0);
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/s, '');
    const data = tar.subarray(offset + BLOCK, offset + BLOCK + size);
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;

    if (typeflag === 'L') {
      gnuLongName = data.toString('utf8').replace(/\0.*$/s, '');
      continue;
    }
    if (typeflag === 'x' || typeflag === 'g') {
      /* pax records: "<length> <key>=<value>\n", the length counting itself. */
      const text = data.toString('utf8');
      let at = 0;
      while (at < text.length) {
        const space = text.indexOf(' ', at);
        if (space < 0) break;
        const len = Number.parseInt(text.slice(at, space), 10);
        if (!Number.isFinite(len) || len <= 0) break;
        const record = text.slice(space + 1, at + len);
        const eq = record.indexOf('=');
        if (eq > 0 && record.slice(0, eq) === 'path') paxPath = record.slice(eq + 1, -1);
        at += len;
      }
      continue;
    }

    const full = paxPath ?? gnuLongName ?? (prefix === '' ? name : `${prefix}/${name}`);
    paxPath = null;
    gnuLongName = null;
    const rel = full.startsWith(PREFIX) ? full.slice(PREFIX.length) : full;

    if (typeflag === '0' || typeflag === '\0') {
      entries.push({ path: rel, type: 'file', size, bytes: Buffer.from(data) });
    } else if (typeflag === '5') {
      entries.push({ path: rel, type: 'directory', size: 0 });
    } else {
      /*
       * Symlinks and hardlinks are refused rather than followed. A shipped
       * symlink either points outside the package (a leak) or depends on the
       * installation layout (not portable), and npm does not write one here —
       * so meeting one means the input is not what this reader assumes.
       */
      throw new Error(`tarball: unsupported entry type ${JSON.stringify(typeflag)} at ${full}`);
    }
  }

  return entries;
}

/**
 * Pack a built package the way a consumer would receive it.
 *
 * The archive is read back and its file list compared with npm's own. They can
 * only disagree if this reader is wrong — and a reader that is wrong would
 * make every check downstream pass vacuously, asserting things about a file
 * list nobody unpacked.
 *
 * @param {string} dir the package directory, normally under `dist/`
 * @param {string} [destination] where the `.tgz` is written; defaults to `dir`
 * @returns {PackedPackage}
 */
export function pack(dir, destination = dir) {
  mkdirSync(destination, { recursive: true });

  const stdout = execFileSync(
    'npm',
    ['pack', '--json', '--pack-destination', destination, '--loglevel=error', '.'],
    { cwd: dir, encoding: 'utf8' },
  );
  const [summary] = JSON.parse(stdout);
  if (!summary || typeof summary.filename !== 'string') {
    throw new Error(`npm pack produced no summary for ${dir}: ${stdout.slice(0, 400)}`);
  }

  const tarball = join(destination, summary.filename);
  const bytes = readFileSync(tarball);
  const entries = untar(bytes);

  const reported = /** @type {{ path: string }[]} */ (summary.files).map((f) => f.path).sort();
  const found = entries
    .filter((e) => e.type === 'file')
    .map((e) => e.path)
    .sort();
  if (reported.join('\n') !== found.join('\n')) {
    /** @param {string[]} a @param {string[]} b */
    const only = (a, b) => a.filter((x) => !b.includes(x));
    throw new Error(
      `tarball: this reader disagrees with npm about ${summary.filename}.\n` +
        `  only in npm's list: ${only(reported, found).join(', ') || '(none)'}\n` +
        `  only in the archive: ${only(found, reported).join(', ') || '(none)'}`,
    );
  }

  const manifestEntry = entries.find((e) => e.path === 'package.json');
  if (!manifestEntry?.bytes) throw new Error(`tarball: ${summary.filename} has no package.json`);

  return {
    name: summary.name,
    version: summary.version,
    filename: summary.filename,
    tarball,
    bytes,
    size: bytes.length,
    unpackedSize: summary.unpackedSize,
    files: summary.files,
    entries,
    manifest: JSON.parse(manifestEntry.bytes.toString('utf8')),
    read: (/** @type {string} */ path) => {
      const entry = entries.find((e) => e.path === path && e.type === 'file');
      if (!entry?.bytes) throw new Error(`tarball: ${summary.filename} ships no ${path}`);
      return entry.bytes;
    },
  };
}

/**
 * Unpack archive entries into `destDir`, refusing anything that would escape.
 *
 * @param {TarEntry[]} entries from `pack(...).entries` or `untar`
 * @param {string} destDir
 * @returns {string[]} the paths written, relative to `destDir`
 */
export function extract(entries, destDir) {
  const written = [];
  for (const entry of entries) {
    const target = join(destDir, entry.path);
    if (target !== destDir && !target.startsWith(destDir + '/')) {
      throw new Error(`tarball: ${entry.path} escapes ${destDir}`);
    }
    if (entry.type === 'directory') {
      mkdirSync(target, { recursive: true });
      continue;
    }
    if (!entry.bytes) throw new Error(`tarball: ${entry.path} has no bytes`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, entry.bytes);
    written.push(entry.path);
  }
  return written;
}

/**
 * The three numbers a size budget is written in.
 *
 * Compression levels are pinned, because a budget measured at gzip 9 and
 * checked at gzip 6 is not the same budget. Brotli 11 is the level a CDN would
 * use; gzip 9 is node's best.
 *
 * @param {Buffer} bytes
 * @returns {{ raw: number, gzip: number, brotli: number }}
 */
export function measure(bytes) {
  return {
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}
