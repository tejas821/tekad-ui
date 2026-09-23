import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-divider-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Divider"
      package="@tekad/divider"
      selector="tk-divider"
      description="A visual separator. Renders as a decorated native &lt;hr&gt;. Horizontal or vertical."
      [tags]="['Standalone', 'Native Element']"
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
export class DividerDocComponent {
  usageCode = `<p>Content above</p>
<tk-divider />
<p>Content below</p>

<!-- Vertical divider (in a flex row) -->
<span>Left</span>
<tk-divider orientation="vertical" />
<span>Right</span>`;
}
