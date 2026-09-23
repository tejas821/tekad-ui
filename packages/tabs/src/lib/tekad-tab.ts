import { ChangeDetectionStrategy, Component, input, TemplateRef, viewChild } from '@angular/core';

/**
 * A single tab panel definition.
 *
 * Usage: `<tk-tab label="Overview">...content...</tk-tab>`
 * The tab group reads the label and projects the content when active.
 */
@Component({
  selector: 'tk-tab',
  standalone: true,
  template: `
    <ng-template #content>
      <ng-content />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadTab {
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly contentTpl = viewChild<TemplateRef<unknown>>('content');
}
