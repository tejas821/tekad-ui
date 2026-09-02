/**
 * `@tekad/checkbox`
 *
 * A checkbox implementing Angular's `FormCheckboxControl` — a `checked` model
 * and no `value`, per ADR-013.
 *
 * Reactive Forms support is NOT here. It is a separate directive in
 * `@tekad/forms/compat`, because a class implementing both contracts compiles,
 * boots, renders and silently never binds its signal model — measured in
 * Angular 22.1.4, not assumed.
 */
export { TekadCheckbox } from './lib/tekad-checkbox';
