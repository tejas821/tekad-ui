/**
 * `@tekad/core` — primary entry point.
 *
 * Deliberately almost empty. ADR-004: a package boundary exists where an
 * independently consumable capability exists, and the primary entry point is
 * not a dumping ground for everything that has no other home. Capabilities live
 * in secondary entry points, so a consumer pays only for what they import.
 */
export { TEKAD_VERSION } from './lib/version';
