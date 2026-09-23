import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-switch-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Switch"
      package="@tekad/switch"
      selector="tk-switch"
      description="A toggle switch built on a native checkbox input with role=&quot;switch&quot;. The track and thumb are painted over the real input."
      [tags]="['Standalone', 'Signals', 'Native Input', 'role=switch']"
    />
    <section class="doc-section">
      <h2>Basic Usage</h2>
      <div class="demo-box"><div class="demo-preview">
        <label class="demo-switch"><input type="checkbox" checked /><span class="demo-switch__track"><span class="demo-switch__thumb"></span></span><span>Enable notifications</span></label>
      </div></div>
      <app-code-viewer [code]="basicCode" language="html" label="HTML" />
    </section>
    <section class="doc-section">
      <h2>API Reference</h2>
      <div class="api-table"><table>
        <thead><tr><th>Input</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>checked</code></td><td><code>ModelSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Two-way bindable toggle state</td></tr>
          <tr><td><code>disabled</code></td><td><code>InputSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Disable the switch</td></tr>
          <tr><td><code>touch</code></td><td><code>OutputRef&lt;void&gt;</code></td><td>—</td><td>Emitted on blur</td></tr>
        </tbody>
      </table></div>
    </section>
  `,
  styles: [`
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } }
    .demo-box { margin-bottom: 1rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg); overflow: hidden; }
    .demo-preview { padding: 2rem; background: var(--tk-surface-variant); }
    .demo-switch { display: inline-flex; align-items: center; gap: 0.625rem; cursor: pointer; font-size: 0.9375rem; }
    .demo-switch input { display: none; }
    .demo-switch__track { width: 44px; height: 24px; background: var(--tk-outline); border-radius: 9999px; position: relative; transition: background 0.15s; }
    .demo-switch__thumb { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.15s; }
    .demo-switch input:checked + .demo-switch__track { background: var(--tk-primary); }
    .demo-switch input:checked + .demo-switch__track .demo-switch__thumb { transform: translateX(20px); }
    .api-table { overflow-x: auto; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg);
      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 0.75rem 1rem; background: var(--tk-surface-variant); font-weight: 600; border-bottom: 1px solid var(--tk-outline-variant); }
      td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--tk-outline-variant); color: var(--tk-on-surface-variant); }
    }
  `],
})
export class SwitchDocComponent {
  basicCode = `<tk-switch [(checked)]="notifications">
  Enable notifications
</tk-switch>

<tk-switch [(checked)]="darkMode" [disabled]="true">
  Dark mode (disabled)
</tk-switch>`;
}
