import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  signal,
} from '@angular/core';
import { uniqueId } from '@tekad/core/primitives/identity';
import { provideTekadFieldContext, type TekadFieldContext } from '@tekad/core/forms/field-context';
import { TekadFieldError } from './tekad-field-error';
import { TekadFieldHint } from './tekad-field-hint';

/**
 * A labelled form field: label, control, hint, error text.
 *
 * ```html
 * <tk-form-field label="Email">
 *   <input tkInput [(value)]="email" />
 *   <tk-field-hint>We will not share it.</tk-field-hint>
 *   <tk-field-error>Enter a valid address.</tk-field-error>
 * </tk-form-field>
 * ```
 *
 * ── What this component is actually for ───────────────────────────────────
 *
 * Not layout. The whole of it is **ARIA IDREF wiring**, which is tedious, easy
 * to get subtly wrong, and fails silently when it is:
 *
 *   - `<label for>` must name the control's id. The control owns that id
 *     (a consumer may have supplied one), so the control announces it.
 *   - `aria-describedby` must list the hint and every visible error, in an
 *     order the user hears usefully, and must be ABSENT rather than empty when
 *     there is nothing to describe.
 *   - An error must be announced when it appears, which is a live region, not
 *     an attribute.
 *
 * None of that errors when it is wrong. The field renders, looks correct, and
 * a screen-reader user gets an unlabelled box with no idea why it is rejected.
 *
 * It is also the concrete reason ADR-007 decision 8 bans Shadow DOM: every
 * reference above is an IDREF, and an IDREF does not cross a shadow boundary.
 * It does not error either — it resolves to nothing.
 *
 * ── Why the control is projected rather than owned ────────────────────────
 *
 * ADR-006 tier 2. The field must accept a control it has never heard of — a
 * TEKAD input today, a consumer's own control tomorrow — so it never queries
 * for a component type. It offers `TEKAD_FIELD_CONTEXT` and anything that
 * injects it participates. A control that does not is still rendered; it is
 * simply not wired, which is the honest outcome.
 */
@Component({
  selector: 'tk-form-field',
  standalone: true,
  templateUrl: './tekad-form-field.html',
  styleUrl: './tekad-form-field.css',
  providers: [provideTekadFieldContext(TekadFormField)],
  host: { class: 'tk-form-field' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadFormField implements TekadFieldContext {
  /** The visible label. Required in practice: a field without one is a bug. */
  readonly label = input<string>('');

  /* ── projected parts ──────────────────────────────────────────────────── */

  private readonly hints = contentChildren(TekadFieldHint);
  private readonly errors = contentChildren(TekadFieldError);

  /* ── TekadFieldContext ────────────────────────────────────────────────── */

  /**
   * Errors first, then hints.
   *
   * Assistive technology reads `aria-describedby` in the order given, and a
   * user who has just been told their input is wrong needs the reason before
   * the advice. The DOM order is the other way round, because visually the
   * hint sits under the control and the error replaces it — so this is
   * deliberately not "whatever order they were projected in".
   */
  readonly describedBy = computed(() => {
    const ids = [
      ...this.errors().map((e) => e.resolvedId()),
      ...this.hints().map((h) => h.resolvedId()),
    ];
    // null, never ''. An empty aria-describedby is a reference to a missing
    // element rather than an absence, and some assistive technology reports it
    // as such.
    return ids.length > 0 ? ids.join(' ') : null;
  });

  /**
   * True when an error message is present.
   *
   * There is deliberately no `[invalid]` input alongside this. One was
   * written and removed: it had no use that rendering a `<tk-field-error>`
   * did not already cover, and a field marked invalid with nothing to say is a
   * control the user is told to fix without being told how. The presence of a
   * message is the single source of truth (CLAUDE.md rule 9).
   */
  readonly invalid = computed(() => this.errors().length > 0);

  /** @see TekadFieldContext.setControlId */
  setControlId(id: string): void {
    this.controlId.set(id);
  }

  /* ── internals ────────────────────────────────────────────────────────── */

  /**
   * Written by the control during ITS construction, which is inside this
   * component's content — so it happens after the field's constructor and
   * before the first render of the label. A plain signal rather than an input
   * because the direction is control -> field.
   */
  protected readonly controlId = signal<string | null>(null);

  protected readonly labelId = uniqueId('tk-field-label');

  /**
   * `for` is omitted rather than empty when no control has announced itself.
   *
   * `<label for="">` points at nothing, and a label pointing at nothing is
   * worse than a label pointing nowhere: the browser stops treating the label
   * as implicitly associated with a contained control, so a field that would
   * have worked by containment stops working.
   */
  protected readonly labelFor = computed(() => this.controlId());
}
