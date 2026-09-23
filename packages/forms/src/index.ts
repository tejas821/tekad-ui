/**
 * `@tekad/forms`
 *
 * TEKAD does not wrap Angular's forms contracts. `FormValueControl`,
 * `FormCheckboxControl` and the `touch`/`touched` pair are Angular's, from
 * `@angular/forms/signals`, and re-exporting them would put a TEKAD name and a
 * TEKAD version on an API Angular maintains (CLAUDE.md rule 1: KEEP).
 *
 * So this primary entry point is deliberately empty of runtime code. What the
 * package ships is in `@tekad/forms/compat`: the Reactive Forms adapter, which
 * exists because a control may implement exactly ONE forms contract.
 *
 * The version constant is here so the package has a real export and its
 * packaging is exercised by the same gates as every other entry point — an
 * entry point that exports nothing is not proved to work by anything.
 */
export const TEKAD_FORMS_VERSION = '0.1.0';
