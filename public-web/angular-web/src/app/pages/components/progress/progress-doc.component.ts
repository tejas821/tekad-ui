import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-progress-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Progress"
      package="@tekad/progress"
      selector="tk-progress"
      description="A determinate or indeterminate progress bar on a native &lt;progress&gt; element."
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
export class ProgressDocComponent {
  usageCode = `<!-- Determinate -->
<tk-progress [value]="65" [max]="100" ariaLabel="Upload progress" />

<!-- Indeterminate (no value) -->
<tk-progress ariaLabel="Loading" />`;
}
