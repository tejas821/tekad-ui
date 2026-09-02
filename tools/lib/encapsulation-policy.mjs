/**
 * TEKAD — view encapsulation is not a per-component choice.
 *
 * ── ShadowDom: banned, and the reason is not aesthetic ───────────────────
 *
 * ADR-007 decision 8: "No Shadow DOM in v1 — ARIA IDREF attributes cannot
 * cross a shadow boundary, breaking every composite widget spanning
 * components."
 *
 * That is the whole accessibility model. A `<tk-label>` pointing at a
 * `<tk-input>` with `aria-labelledby`, a listbox whose `aria-activedescendant`
 * names an option in a child component, a form field wiring
 * `aria-describedby` to its own error text — every one of those is an IDREF
 * resolved against the containing tree, and every one silently resolves to
 * nothing across a shadow boundary. Nothing throws. The widget renders, looks
 * right, and is unlabelled.
 *
 * A single component opting into `ShadowDom` breaks the composite widgets it
 * participates in, not just itself, so it cannot be a local decision.
 *
 * ── None: measured to buy nothing, and to cost something ─────────────────
 *
 * The intuition is that `ViewEncapsulation.None` makes SSR HTML dramatically
 * smaller — a 1,000-row table does carry ~9,000 fewer attributes and 246 KB
 * less raw HTML. Measured through a compressor, that saving is not there:
 * gzip is 4.8% SMALLER with emulated encapsulation than without it, because
 * the repeated attribute is the same 27 bytes every time and lengthens the
 * unit the compressor back-references.
 *
 * So `None` trades away real style isolation for a saving that only exists
 * before compression, and it makes every TEKAD class name a global name a
 * consumer can collide with — permanently, since removing a global selector
 * later is a breaking change.
 *
 * Both overrides therefore need a recorded reason rather than a preference,
 * which is what this reports.
 */

/**
 * @typedef {object} Finding
 * @property {string} file
 * @property {number} line
 * @property {string} cls
 * @property {string} why
 */

const WHY = {
  ShadowDom:
    'ViewEncapsulation.ShadowDom is forbidden (ADR-007 decision 8). ARIA IDREF ' +
    'attributes — aria-labelledby, aria-describedby, aria-activedescendant, ' +
    'aria-controls — cannot cross a shadow boundary. They do not error; they ' +
    'resolve to nothing, and the widget renders looking correct and unlabelled. ' +
    'One component opting in breaks every composite widget it takes part in.',
  None:
    'ViewEncapsulation.None makes this component’s selectors global, so every ' +
    'class name in it becomes a name a consumer can collide with and TEKAD can ' +
    'never narrow. The SSR saving that motivates it does not survive ' +
    'compression — measured at gzip -4.8%, i.e. emulated is smaller. If there ' +
    'is a real reason, record it in an ADR and add the exception here.',
};

/**
 * Classes are found by scanning for the decorator's `encapsulation:` property
 * rather than by parsing TypeScript. The property is written one way in
 * practice, and a full parse would be a dependency and a second thing to keep
 * correct — CLAUDE.md rule 9. The trade-off is stated so the next person knows
 * the limit: a component setting encapsulation through a shared constant or a
 * spread is not seen here.
 *
 * @param {string[]} files
 * @param {(f: string) => string} read
 * @param {string} root  for relative paths in the report
 * @param {Set<string>} [exceptions]  file:class pairs with a recorded reason
 * @returns {Finding[]}
 */
export function encapsulationFindings(files, read, root, exceptions = new Set()) {
  /** @type {Finding[]} */
  const out = [];
  for (const file of files) {
    const text = read(file);
    const re = /encapsulation\s*:\s*ViewEncapsulation\.(\w+)/g;
    let match;
    while ((match = re.exec(text)) !== null) {
      const mode = match[1];
      if (mode !== 'ShadowDom' && mode !== 'None') continue;

      const before = text.slice(0, match.index);
      const line = before.split('\n').length;
      // The class this decorator belongs to is the next one declared after it.
      const after = text.slice(match.index);
      const cls = /class\s+(\w+)/.exec(after)?.[1] ?? '(unknown)';
      const rel = file.startsWith(root) ? file.slice(root.length + 1) : file;
      if (exceptions.has(`${rel}:${cls}`)) continue;

      out.push({ file: rel, line, cls, why: WHY[mode] });
    }
  }
  return out;
}
