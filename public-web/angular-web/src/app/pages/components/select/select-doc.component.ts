import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-select-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Select"
      package="@tekad/select"
      selector="tk-select"
      description="A select control decorating a native &lt;select&gt;. FormValueControl&lt;string&gt; for signal forms."
      [tags]="['Standalone', 'Signals', 'Native Element']"
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
export class SelectDocComponent {
  usageCode = `<tk-form-field label="Country">
  <tk-select [(value)]="country">
    <option value="">Select a country</option>
    <option value="in">India</option>
    <option value="us">United States</option>
    <option value="id">Indonesia</option>
  </tk-select>
</tk-form-field>`;
}
