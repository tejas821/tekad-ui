/**
 * `@tekad/dialog`
 *
 * A modal dialog built on the native `<dialog>` element and `showModal()`,
 * which supplies the focus trap, background inertness, `aria-modal`, Escape
 * handling and focus restoration that ADR-010 originally expected TEKAD to
 * build.
 *
 * What TEKAD supplies is the exit animation, because a top-layer element is
 * removed from the top layer the moment `close()` is called. That is
 * `@tekad/overlay`'s deferred-close primitive, and this is its first consumer.
 */
export { TekadDialog } from './lib/tekad-dialog';
