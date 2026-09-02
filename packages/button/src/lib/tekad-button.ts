import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { uniqueId } from '@tekad/core/primitives/identity';

/**
 * How a button presents itself.
 *
 * Three, and no more, because each one is a public name with a compatibility
 * obligation (ADR-004). `filled` is the default action, `outlined` the
 * secondary one, `text` the tertiary. A fourth would need a use, not a
 * catalogue.
 *
 * Notably absent: a `tone` or `colour` input. A destructive button is
 *
 *     <button tkButton style="--tekad-button-background: var(--tekad-sys-color-danger);
 *                             --tekad-button-foreground: var(--tekad-sys-color-on-danger)">
 *
 * or the same two declarations in a class. That is ADR-006's tier 2 — the
 * component's own token tier is the customisation surface — and it reaches
 * colours TEKAD never anticipated without waiting for a release. A `tone`
 * input would enumerate a fixed list of them and make every addition a
 * breaking-change conversation.
 */
export type TekadButtonAppearance = 'filled' | 'outlined' | 'text';

/**
 * A button.
 *
 * ── Why an attribute selector on a native `<button>` ──────────────────────
 *
 * `button[tkButton]`, not `<tk-button>`. The component does not own the
 * element; it decorates one the consumer wrote. That buys three things that
 * are difficult to get back afterwards:
 *
 *   1. **Forced colours work by default.** ADR-007 decision 7: the UA maps
 *      system colours by element semantics, not ARIA role. A real `<button>`
 *      is mapped to ButtonFace/ButtonText with no help. A `<tk-button>`
 *      wrapper containing a `<button>` adds an element the UA has no opinion
 *      about, and a `<div role="button">` gets no mapping at all.
 *
 *   2. **Every native behaviour is already correct** — Enter and Space
 *      activation, form submission and reset, `disabled` removing the control
 *      from the tab order and the accessibility tree, the `formaction` family,
 *      `popovertarget`. None of it is reimplemented, so none of it can be
 *      reimplemented wrongly. This is CLAUDE.md rule 1: KEEP before BUILD.
 *
 *   3. **No extra element in the DOM.** A wrapper on a 200-button page is 200
 *      elements, and `docs/architecture/15-ssr-encapsulation.md` measured what
 *      element count costs: the component instance is the expensive part of
 *      SSR output, not the encapsulation attribute.
 *
 * The cost is that a consumer must write `<button tkButton>` rather than
 * `<tk-button>`, and that `<button>` is the thing they style and query. That
 * is the right trade for a control whose native version is this good.
 *
 * ── View encapsulation is not set here ────────────────────────────────────
 *
 * Deliberately absent. Angular's default — `Emulated` — is the decision, and
 * `docs/architecture/15-ssr-encapsulation.md` is why: measured on a 1,000-row
 * table its transfer cost is nil (gzip is 4.8% *smaller* with it than
 * without), while `None` would make every `.tk-*` class a global name TEKAD
 * could never narrow again. `tools/verify-ssr-encapsulation.mjs` enforces it.
 */
@Component({
  selector: 'button[tkButton]',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './tekad-button.css',
  host: {
    '[attr.id]': 'resolvedId()',
    '[attr.type]': 'type()',
    '[class]': 'classes()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadButton {
  /**
   * Native button type.
   *
   * Defaulted to `button` on purpose. An unset `type` inside a `<form>` means
   * `submit` — so a "Cancel" written without a type submits the form, which is
   * the single most common accidental bug in hand-rolled button components. It
   * is invisible until the button is placed in a form, which may be months
   * after it was written.
   */
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  /** @see TekadButtonAppearance */
  readonly appearance = input<TekadButtonAppearance>('filled');

  /**
   * An explicit id always wins; otherwise one is generated.
   *
   * A button needs a stable id more often than it looks: `aria-describedby`
   * from an error summary, `aria-labelledby` from an icon-only button's
   * tooltip, `popovertarget` pointing back at it.
   */
  readonly id = input<string | undefined>(undefined);

  protected readonly resolvedId = computed(() => this.id() ?? this.generatedId);

  /**
   * Bound as a single `[class]` string rather than several `[class.x]`
   * bindings, because a consumer's own `class="..."` on the host must survive.
   * Angular merges a static host `class` attribute with a `[class]` binding;
   * `<button tkButton class="mine">` keeps `mine`.
   */
  protected readonly classes = computed(() => `tk-button tk-button--${this.appearance()}`);

  private readonly generatedId = uniqueId('tk-button');
}
