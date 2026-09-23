import { ChangeDetectionStrategy, Component, contentChildren, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TekadTab } from './tekad-tab';

/**
 * A tabbed interface.
 *
 * Implements the WAI-ARIA tabs pattern with roving tabindex keyboard
 * navigation. Arrow keys move between tabs; Home/End jump to first/last;
 * Enter/Space activates.
 *
 * Uses the real `<button>` for each tab trigger and `role="tablist"` on
 * the container. The platform handles focus, activation, and forced-colours
 * mapping by element semantics.
 */
@Component({
  selector: 'tk-tab-group',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="tk-tabs__list" role="tablist">
      @for (tab of tabs(); track tab; let i = $index) {
        <button
          class="tk-tabs__tab"
          type="button"
          role="tab"
          [attr.aria-selected]="activeIndex() === i"
          [attr.tabindex]="activeIndex() === i ? 0 : -1"
          [disabled]="tab.disabled()"
          (click)="select(i)"
          (keydown)="onKeydown($event, i)"
        >
          {{ tab.label() }}
        </button>
      }
    </div>
    <div class="tk-tabs__panel" role="tabpanel">
      @for (tab of tabs(); track tab; let i = $index) {
        @if (activeIndex() === i) {
          <ng-container [ngTemplateOutlet]="tab.contentTpl()!" />
        }
      }
    </div>
  `,
  styleUrl: './tekad-tab-group.css',
  host: { class: 'tk-tabs' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadTabGroup {
  readonly tabs = contentChildren(TekadTab);
  readonly activeIndex = signal(0);

  select(index: number): void {
    const t = this.tabs()[index];
    if (t && !t.disabled()) this.activeIndex.set(index);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const tabs = this.tabs();
    const len = tabs.length;
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % len;
        break;
      case 'ArrowLeft':
        next = (index - 1 + len) % len;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = len - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    let attempts = 0;
    while (tabs[next]?.disabled() && attempts < len) {
      next = event.key === 'ArrowLeft' ? (next - 1 + len) % len : (next + 1) % len;
      attempts++;
    }
    this.select(next);
    const el = (event.currentTarget as HTMLElement)?.parentElement;
    const btns = el?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    btns?.[next]?.focus();
  }
}
