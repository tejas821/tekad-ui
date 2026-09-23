import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-table-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Table"
      package="@tekad/table"
      selector="table[tkTable]"
      description="A table foundation that decorates a native &lt;table&gt;. ADR-014: a cell is not a component."
      [tags]="['Standalone', 'Native Element', 'No Per-Cell Components']"
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
export class TableDocComponent {
  usageCode = `<table tkTable [striped]="true">
  <thead>
    <tr><th>Name</th><th>Email</th><th>Role</th></tr>
  </thead>
  <tbody>
    @for (user of users; track user.id) {
      <tr>
        <td>{{ user.name }}</td>
        <td>{{ user.email }}</td>
        <td>{{ user.role }}</td>
      </tr>
    }
  </tbody>
</table>`;
}
