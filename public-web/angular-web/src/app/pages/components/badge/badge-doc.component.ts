import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-badge-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Badge"
      package="@tekad/badge"
      selector="tk-badge"
      description="A small count or status indicator. Tones: neutral, primary, success, warning, danger."
      [tags]="['Standalone', 'Content Projection']"
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
export class BadgeDocComponent {
  usageCode = `<tk-badge>New</tk-badge>
<tk-badge tone="primary">Pro</tk-badge>
<tk-badge tone="danger">99+</tk-badge>
<tk-badge tone="success">Active</tk-badge>
<tk-badge [dot]="true" tone="danger"></tk-badge>`;
}
