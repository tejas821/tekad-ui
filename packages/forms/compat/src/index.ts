/**
 * `@tekad/forms/compat`
 *
 * Reactive Forms support for TEKAD controls, as a separate directive.
 *
 * Its own entry point so a consumer using only signal forms never pays for it,
 * and so that the separation ADR-013 requires is structural rather than a
 * convention. A control implementing both forms contracts compiles, boots,
 * renders and silently never binds its signal model — measured in Angular
 * 22.1.4, not assumed.
 */
export { TekadCompatAdapter } from './lib/compat-adapter';
