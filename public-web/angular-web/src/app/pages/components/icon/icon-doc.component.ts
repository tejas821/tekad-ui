import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-icon-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Icon"
      package="@tekad/icon"
      selector="tk-icon"
      description="An inline SVG icon container. Provides sizing, color inheritance, and accessibility semantics. You bring the SVG."
      [tags]="['Standalone', 'Content Projection', 'ARIA']"
    />
    <section class="doc-section">
      <h2>Basic Usage</h2>
      <div class="demo-box"><div class="demo-preview" style="display:flex;gap:1rem;align-items:center;">
        <span style="display:inline-flex;width:24px;height:24px;color:var(--tk-primary);"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
        <span style="display:inline-flex;width:32px;height:32px;color:var(--tk-danger);"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
        <span style="display:inline-flex;width:40px;height:40px;color:var(--tk-success);"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
      </div></div>
      <app-code-viewer [code]="basicCode" language="html" label="HTML" />
    </section>
    <section class="doc-section">
      <h2>API Reference</h2>
      <div class="api-table"><table>
        <thead><tr><th>Input</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>size</code></td><td><code>string</code></td><td><code>'1em'</code></td><td>Rendered size (scales with text by default)</td></tr>
          <tr><td><code>ariaLabel</code></td><td><code>string</code></td><td><code>''</code></td><td>Accessible label (required for meaningful icons)</td></tr>
          <tr><td><code>ariaHidden</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Set true for decorative icons</td></tr>
        </tbody>
      </table></div>
    </section>
  `,
  styles: [`
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } }
    .demo-box { margin-bottom: 1rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg); overflow: hidden; }
    .demo-preview { padding: 2rem; background: var(--tk-surface-variant); }
    .api-table { overflow-x: auto; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg);
      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 0.75rem 1rem; background: var(--tk-surface-variant); font-weight: 600; border-bottom: 1px solid var(--tk-outline-variant); }
      td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--tk-outline-variant); color: var(--tk-on-surface-variant); }
    }
  `],
})
export class IconDocComponent {
  basicCode = `<!-- Meaningful icon — needs aria-label -->
<tk-icon ariaLabel="Favorite" size="24px">
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32..."/>
  </svg>
</tk-icon>

<!-- Decorative icon — hidden from AT -->
<tk-icon [ariaHidden]="true" size="16px">
  <svg>...</svg>
</tk-icon>

<!-- Icon in a button — inherits button text color -->
<button tkButton>
  <tk-icon [ariaHidden]="true"><svg>...</svg></tk-icon>
  Save
</button>`;
}
