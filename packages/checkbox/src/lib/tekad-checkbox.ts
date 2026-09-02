import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  viewChild,
  type ElementRef,
  type ModelSignal,
} from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';
import { uniqueId } from '@tekad/core/primitives/identity';
import { provideTekadModelControl, type TekadModelControl } from '@tekad/core/forms/model-control';

/**
 * A checkbox.
 *
 * ── The contract ──────────────────────────────────────────────────────────
 *
 * `FormCheckboxControl` from `@angular/forms/signals` — a `checked` model and
 * no `value`, which is Angular's own split and ADR-013's decision. The
 * interface is Angular's, not TEKAD's: wrapping it would put a TEKAD name and
 * a TEKAD version on an API Angular maintains (CLAUDE.md rule 1).
 *
 * It implements exactly one forms contract. `ControlValueAccessor` support
 * lives in `@tekad/forms/compat` as a separate directive, and
 * `tools/verify-forms-contracts.mjs` fails the build if the two ever meet on
 * one class. That gate is load-bearing rather than tidy: measured in Angular
 * 22.1.4, a class implementing both compiles, boots, renders, and silently
 * never binds its signal model.
 *
 * ── Why a native `<input type="checkbox">` inside ─────────────────────────
 *
 * The button decorates a native element; a checkbox cannot, because it needs a
 * label and a drawn box around the input. So the native input is *inside*, and
 * everything that depends on it being native still holds: Space activation,
 * form participation, `indeterminate`, the accessibility tree's `checkbox`
 * role and mixed state, and the forced-colors mapping ADR-007 decision 7
 * depends on. The box is drawn over it, not instead of it.
 *
 * The whole thing is wrapped in a `<label>`, so the label text is the input's
 * accessible name by containment — no `for`/`id` pair to get out of step, and
 * clicking the text toggles the box because the browser says so.
 */
@Component({
  selector: 'tk-checkbox',
  standalone: true,
  templateUrl: './tekad-checkbox.html',
  styleUrl: './tekad-checkbox.css',
  providers: [provideTekadModelControl(TekadCheckbox)],
  host: {
    '[attr.id]': 'resolvedId()',
    // The host is a layout wrapper, never the control. Without this a screen
    // reader meets a group-shaped element with no role and reads its text
    // twice — once as the host's content, once as the input's name.
    class: 'tk-checkbox',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadCheckbox implements FormCheckboxControl, TekadModelControl<boolean> {
  /**
   * The signal-forms contract: `checked`, and no `value`.
   *
   * A `model` rather than an `input` + `output` pair, because signal forms
   * write to it as well as read it.
   */
  readonly checked: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Emitted when the user leaves the control.
   *
   * `touch`, an `OutputRef<void>` the control emits — NOT `touched`, the
   * `InputSignal<boolean>` a field pushes in. One letter apart, opposite
   * directions, and both exist on the same contract.
   */
  readonly touch = output<void>();

  /** Set by a field to reflect its touched state back into the control. */
  readonly touched = input<boolean>(false);

  /** Disabled by the component's author. @see disabledByForm */
  readonly disabled = input<boolean>(false);

  /**
   * The third state: neither checked nor unchecked.
   *
   * Notable because it is a DOM PROPERTY with no HTML attribute. Writing
   * `indeterminate="true"` in a template does nothing at all — it must be
   * assigned to the element. That is why this component owns a `viewChild` and
   * an effect rather than binding an attribute, and why there is a test and a
   * mutant for it.
   *
   * `checked` is unaffected: an indeterminate checkbox still has a checked
   * value underneath, exactly as the platform defines it.
   */
  readonly indeterminate = input<boolean>(false);

  /**
   * Forwarded to the native input, for form submission and grouping.
   *
   * `InputSignal<string>`, not `string | undefined`, because that is what
   * `FormUiControl` declares — and the direction is the surprise: a bound
   * field PUSHES a name in, derived from the field's position in the schema.
   * Typing it as optional makes the class fail to satisfy the interface, which
   * is how this was found.
   *
   * Defaulted to the empty string, and the template omits the attribute when
   * it is empty rather than rendering `name=""`.
   */
  readonly name = input<string>('');

  /** An explicit id always wins; otherwise one is generated. */
  readonly id = input<string | undefined>(undefined);

  /* ── TekadModelControl: the seam for @tekad/forms/compat ──────────────── */

  /** @see TekadModelControl.model */
  readonly model = this.checked;

  /** @see TekadModelControl.disabledByForm */
  readonly disabledByForm = signal(false);

  /** @see TekadModelControl.effectivelyDisabled */
  readonly effectivelyDisabled = computed(() => this.disabled() || this.disabledByForm());

  /* ── internals ────────────────────────────────────────────────────────── */

  protected readonly resolvedId = computed(() => this.id() ?? this.generatedId);
  protected readonly inputId = computed(() => `${this.resolvedId()}-input`);
  /** `null` removes the attribute; `''` would render `name=""`. */
  protected readonly nameAttr = computed(() => this.name() || null);

  private readonly generatedId = uniqueId('tk-checkbox');
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('input');

  constructor() {
    effect(() => {
      const el = this.inputRef()?.nativeElement;
      if (!el) return;
      // Assigned, not bound. `indeterminate` has no HTML attribute; a template
      // binding writes an attribute the platform ignores, and the checkbox
      // renders as plain unchecked while every test that reads the input's
      // property sees `false` and agrees with itself.
      el.indeterminate = this.indeterminate();
    });
  }

  /**
   * The user changed the box.
   *
   * Reads the native element's `checked` rather than trusting the event or the
   * current model: the platform has already decided the new state, and
   * deriving it a second time is how a checkbox ends up out of step with the
   * element the user is looking at.
   */
  protected onChange(event: Event): void {
    const el = event.target as HTMLInputElement | null;
    if (!el) return;
    this.checked.set(el.checked);
  }

  protected onBlur(): void {
    // The one event both form systems observe. Signal forms read this output
    // directly; @tekad/forms/compat subscribes to the same OutputRef through
    // TEKAD_MODEL_CONTROL, so the control never learns which it is in.
    this.touch.emit();
  }
}
