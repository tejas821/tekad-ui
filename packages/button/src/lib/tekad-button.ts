import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { uniqueId } from '@tekad/core/primitives/identity';

/**
 * The smallest component that still exercises everything Phase 2 needs to
 * prove: a standalone component (ADR-004 — NgModules are not public API), a
 * signal input, and a real cross-package import of a two-level secondary entry
 * point from the foundation layer.
 *
 * It is not the eventual TEKAD button. It carries no variants, no theming and
 * no overlay behaviour, because a speculative abstraction here would be an
 * architecture decision smuggled in as a fixture (CLAUDE.md rule 9).
 */
@Component({
  selector: 'button[tkButton]',
  standalone: true,
  template: '<ng-content />',
  host: {
    '[attr.id]': 'resolvedId()',
    '[attr.type]': 'type()',
    '[class.tk-button]': 'true',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadButton {
  /**
   * Native button type. Defaulted to `button` on purpose: an unset `type`
   * inside a form means `submit`, which is the single most common accidental
   * bug in hand-rolled button components.
   */
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  /** An explicit id always wins; otherwise one is generated. */
  readonly id = input<string | undefined>(undefined);

  protected readonly resolvedId = computed(() => this.id() ?? this.generatedId);

  private readonly generatedId = uniqueId('tk-button');
}
