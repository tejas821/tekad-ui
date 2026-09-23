import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-card-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Card"
      package="@tekad/card"
      selector="tk-card"
      description="A content container with optional header and footer slots via content projection."
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
export class CardDocComponent {
  usageCode = `<tk-card>
  <div tkCardHeader>
    <h3>Card Title</h3>
  </div>
  <p>Card body content goes here.</p>
  <div tkCardFooter>
    <button tkButton>Action</button>
  </div>
</tk-card>`;
}
