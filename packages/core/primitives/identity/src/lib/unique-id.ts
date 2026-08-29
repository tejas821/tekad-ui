/**
 * Deterministic-per-process unique id generation.
 *
 * Every accessible widget needs ids to wire `aria-labelledby`,
 * `aria-describedby` and `aria-controls`, and those ids must be stable within a
 * render and unique across the document. This is the smallest real foundation
 * capability TEKAD has, which is why it is the one used to prove the packaging
 * model rather than a placeholder.
 *
 * SSR note: the counter is module-scoped, so a server render and the client
 * hydration of the same component tree produce the same sequence as long as the
 * component tree is the same. That is the property hydration needs. It is NOT a
 * globally unique id and is not suitable as a database key.
 */
let counter = 0;

/**
 * Returns an id unique within this JavaScript context.
 *
 * @param prefix a short, human-readable prefix — it shows up in the DOM and in
 *               accessibility tree dumps, so `'tk-listbox'` beats `'x'`.
 */
export function uniqueId(prefix: string): string {
  return `${prefix}-${++counter}`;
}

/**
 * Resets the counter. Exported for tests only: a test that asserts on rendered
 * ids needs a known starting point, and reaching into module state from a test
 * file is worse than a named function that says what it is for.
 *
 * @internal
 */
export function resetUniqueIdCounterForTesting(): void {
  counter = 0;
}
