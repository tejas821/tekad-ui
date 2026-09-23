import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-tabs-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Tabs"
      package="@tekad/tabs"
      selector="tk-tab-group"
      description="A tabbed interface with WAI-ARIA tabs pattern and roving tabindex keyboard navigation."
      [tags]="['Standalone', 'Keyboard Nav', 'ARIA']"
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
export class TabsDocComponent {
  usageCode = `<tk-tab-group>
  <tk-tab label="Overview">Overview content...</tk-tab>
  <tk-tab label="Features">Features content...</tk-tab>
  <tk-tab label="API" [disabled]="true">API content...</tk-tab>
</tk-tab-group>`;
}
