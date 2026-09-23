import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-tooltip-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Tooltip"
      package="@tekad/tooltip"
      selector="tk-tooltip"
      description="A brief label shown on hover/focus. Uses role=tooltip and aria-describedby wiring."
      [tags]="['Standalone', 'Popover API']"
    />
    <section class="doc-section">
      <h2>Usage</h2>
      <app-code-viewer [code]="usageCode" language="html" label="HTML" />
    </section>
  `,
  styles: [`
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } }
  `],
})
export class TooltipDocComponent {
  usageCode = `<button tkButton
  [attr.aria-describedby]="tooltipId">
  Hover me
</button>
<tk-tooltip [id]="tooltipId">
  Helpful information here
</tk-tooltip>`;
}
