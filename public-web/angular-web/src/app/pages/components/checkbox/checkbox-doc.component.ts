import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-checkbox-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Checkbox"
      package="@tekad/checkbox"
      selector="tk-checkbox"
      description="A FormCheckboxControl with a native input inside a label. The box is painted over the real input — never instead of it."
      [tags]="['Standalone', 'Signals', 'FormCheckboxControl', 'Indeterminate']"
    />

    <section class="doc-section">
      <h2>Import</h2>
      <app-code-viewer [code]="importCode" language="typescript" label="TypeScript" />
    </section>

    <section class="doc-section">
      <h2>Basic Usage</h2>
      <div class="demo-box">
        <div class="demo-preview">
          <label class="demo-checkbox">
            <input type="checkbox" checked />
            <span class="demo-checkbox__box"></span>
            <span>Accept terms and conditions</span>
          </label>
        </div>
      </div>
      <app-code-viewer [code]="basicCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>Two-Way Binding</h2>
      <p>
        <code>checked</code> is a <code>model()</code> signal — signal forms write to it as well as read it.
      </p>
      <app-code-viewer [code]="bindingCode" language="typescript" label="TypeScript" />
    </section>

    <section class="doc-section">
      <h2>Indeterminate State</h2>
      <p>
        The third state: neither checked nor unchecked. <code>indeterminate</code> is a DOM property
        with no HTML attribute — the component uses a <code>viewChild</code> and an <code>effect()</code>
        to assign it.
      </p>
      <div class="demo-box">
        <div class="demo-preview">
          <label class="demo-checkbox">
            <input type="checkbox" />
            <span class="demo-checkbox__box demo-checkbox__box--indeterminate"></span>
            <span>Select all (some selected)</span>
          </label>
        </div>
      </div>
      <app-code-viewer [code]="indeterminateCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>Disabled State</h2>
      <div class="demo-box">
        <div class="demo-preview">
          <label class="demo-checkbox demo-checkbox--disabled">
            <input type="checkbox" disabled />
            <span class="demo-checkbox__box"></span>
            <span>Disabled checkbox</span>
          </label>
          <label class="demo-checkbox demo-checkbox--disabled">
            <input type="checkbox" disabled checked />
            <span class="demo-checkbox__box"></span>
            <span>Disabled checked</span>
          </label>
        </div>
      </div>
      <app-code-viewer [code]="disabledCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>API Reference</h2>
      <div class="api-table">
        <table>
          <thead>
            <tr><th>Input/Output</th><th>Type</th><th>Default</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>checked</code></td><td><code>ModelSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Two-way bindable checked state</td></tr>
            <tr><td><code>indeterminate</code></td><td><code>InputSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>The third (mixed) state</td></tr>
            <tr><td><code>disabled</code></td><td><code>InputSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Disable the control</td></tr>
            <tr><td><code>name</code></td><td><code>InputSignal&lt;string&gt;</code></td><td><code>''</code></td><td>Form submission name</td></tr>
            <tr><td><code>touch</code></td><td><code>OutputRef&lt;void&gt;</code></td><td>—</td><td>Emitted on blur</td></tr>
            <tr><td><code>touched</code></td><td><code>InputSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Set by a bound field</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2>How It Works</h2>
      <div class="callout">
        <p>
          The native <code>&lt;input type="checkbox"&gt;</code> stays in the DOM — made transparent
          but never removed. A <code>&lt;span&gt;</code> is painted over it for visual styling.
          In forced-colors mode, the span is removed and the UA's own checkbox is restored.
        </p>
      </div>
    </section>
  `,
  styles: [`
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } p { color: var(--tk-on-surface-variant); line-height: 1.7; margin-bottom: 1rem; } app-code-viewer { margin-bottom: 1rem; } }
    .demo-box { margin-bottom: 1rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg); overflow: hidden; }
    .demo-preview { padding: 2rem; display: flex; flex-direction: column; gap: 1rem; background: var(--tk-surface-variant); }
    .demo-checkbox { display: inline-flex; align-items: center; gap: 0.625rem; cursor: pointer; font-size: 0.9375rem; min-height: 44px;
      input { appearance: none; width: 20px; height: 20px; border: 2px solid var(--tk-outline); border-radius: 4px; cursor: pointer; flex-shrink: 0; margin: 0;
        &:checked { background: var(--tk-primary); border-color: var(--tk-primary); }
      }
    }
    .demo-checkbox__box { display: none; }
    .demo-checkbox--disabled { opacity: 0.38; cursor: not-allowed; }
    .callout { padding: 1rem 1.25rem; background: var(--tk-primary-container); border-radius: var(--tk-radius-md); border-left: 3px solid var(--tk-primary);
      p { color: var(--tk-on-primary-container); margin: 0; font-size: 0.875rem; }
    }
    .api-table { overflow-x: auto; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg);
      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 0.75rem 1rem; background: var(--tk-surface-variant); font-weight: 600; font-size: 0.8125rem; border-bottom: 1px solid var(--tk-outline-variant); }
      td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--tk-outline-variant); color: var(--tk-on-surface-variant); }
      tr:last-child td { border-bottom: none; }
    }
  `],
})
export class CheckboxDocComponent {
  readonly importCode = `import { TekadCheckbox } from '@tekad/checkbox';

@Component({
  standalone: true,
  imports: [TekadCheckbox],
  template: \`<tk-checkbox [(checked)]="agreed">I agree</tk-checkbox>\`,
})
export class MyComponent {
  agreed = false;
}`;

  readonly basicCode = `<tk-checkbox [(checked)]="termsAccepted">
  Accept terms and conditions
</tk-checkbox>`;

  readonly bindingCode = `import { signal } from '@angular/core';

@Component({
  template: \`
    <tk-checkbox [(checked)]="notifications">
      Enable notifications
    </tk-checkbox>
    <p>Notifications: {{ notifications() ? 'On' : 'Off' }}</p>
  \`,
})
export class MyComponent {
  notifications = signal(true);
}`;

  readonly indeterminateCode = `<tk-checkbox
  [(checked)]="allSelected"
  [indeterminate]="someSelected() && !allSelected()">
  Select all
</tk-checkbox>`;

  readonly disabledCode = `<tk-checkbox [disabled]="true">Disabled checkbox</tk-checkbox>
<tk-checkbox [disabled]="true" [checked]="true">Disabled checked</tk-checkbox>`;
}
