/**
 * `@tekad/overlay` — the deferred-close top-layer primitive.
 *
 * ADR-010, resting on prototype P0's measured evidence rather than on the
 * research-phase hypothesis. See `docs/architecture/12-overlay-foundation.md`.
 */
export {
  TekadDeferredOverlay,
  TEKAD_DEFAULT_EXIT_PROPERTY,
  TEKAD_DEFAULT_SAFETY_MARGIN_MS,
  type TekadOverlayState,
  type TekadOverlayKind,
  type TekadOverlayDiagnostic,
  type TekadDeferredOverlayOptions,
} from './lib/deferred-overlay';
