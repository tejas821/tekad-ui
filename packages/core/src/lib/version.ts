/**
 * The TEKAD version this build was produced from.
 *
 * A plain string constant, not a service: nothing should have to inject the DI
 * container to answer "which version is this". It also gives the tree-shaking
 * probe a symbol in the PRIMARY entry point that a secondary entry point does
 * not use, which is what makes that measurement meaningful.
 */
export const TEKAD_VERSION = '0.0.0';
