import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { uniqueId } from '@tekad/core/primitives/identity';

/**
 * Guidance shown under a control, referenced from its `aria-describedby`.
 *
 * A component rather than a slot name or a CSS class, for one reason: it needs
 * a stable id the field can put in a list. That id is the whole of its API, and
 * it is why the field can compose a description without knowing what a hint
 * says.
 */
@Component({
  selector: 'tk-field-hint',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './tekad-field-hint.css',
  host: {
    '[attr.id]': 'resolvedId()',
    class: 'tk-field-hint',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadFieldHint {
  /** An explicit id always wins; otherwise one is generated. */
  readonly id = input<string | undefined>(undefined);

  /**
   * Public, unlike the `resolvedId` on other TEKAD components, because the
   * form field reads it to build `aria-describedby`. That is the whole API of
   * this component.
   */
  readonly resolvedId = computed(() => this.id() ?? this.generatedId);

  private readonly generatedId = uniqueId('tk-field-hint');
}
