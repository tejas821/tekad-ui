/**
 * The colour-scheme control surface (ADR-007 decision 3).
 *
 * The stylesheet does the work: `color-scheme` is the source of truth and
 * `light-dark()` resolves every token against it, so switching schemes is one
 * attribute and re-declares nothing. This file exists only so that setting the
 * attribute from TypeScript is typed rather than stringly-typed — the attribute
 * name is part of the public contract and a typo in it fails silently.
 */

/**
 * The attribute that overrides the colour scheme for an element and its
 * subtree. Absent, the scheme follows the user's system preference.
 */
export const TEKAD_SCHEME_ATTRIBUTE = 'data-tekad-scheme';

/**
 * `'light'` and `'dark'` pin the scheme. To follow the system preference,
 * REMOVE the attribute rather than setting a third value — `color-scheme:
 * light dark` on `:root` already expresses "either", and a value like
 * `'system'` would need its own CSS rule, which is exactly the variant-axis-as-
 * selector pattern ADR-007's governing rule forbids.
 */
export type TekadScheme = 'light' | 'dark';
