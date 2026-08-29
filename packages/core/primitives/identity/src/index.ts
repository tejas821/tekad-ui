/**
 * `@tekad/core/primitives/identity`
 *
 * A two-level, category-prefixed secondary entry point — the topology ADR-004
 * settled and Spike A and Spike B measured end to end: ng-packagr emits the
 * `./primitives/identity` subpath, and tsserver offers the deep import.
 */
export { uniqueId, resetUniqueIdCounterForTesting } from './lib/unique-id';
