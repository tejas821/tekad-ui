import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-input-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Input"
      package="@tekad/input"
      selector="input[tkInput]"
      description="A FormValueControl&lt;string&gt; that decorates a native &lt;input&gt; element. Keeps autofill, IME, spellcheck, and :user-invalid styling."
      [tags]="['Standalone', 'Signals', 'Native Element', 'FormValueControl']"
    />

    <section class="doc-section">
      <h2>Import</h2>
      <app-code-viewer [code]="importCode" language="typescript" label="TypeScript" />
    </section>

    <section class="doc-section">
      <h2>Basic Usage</h2>
      <div class="demo-box">
        <div class="demo-preview">
          <input class="demo-input" type="text" placeholder="Enter your name" />
        </div>
      </div>
      <app-code-viewer [code]="basicCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>With Form Field</h2>
      <p>Pair with <code>&lt;tk-form-field&gt;</code> for labels, hints, and error messages with automatic ARIA wiring.</p>
      <div class="demo-box">
        <div class="demo-preview">
          <div class="demo-field">
            <label class="demo-field__label">Email address</label>
            <input class="demo-input" type="email" placeholder="you&#64;example.com" />
            <span class="demo-field__hint">We will never share your email.</span>
          </div>
        </div>
      </div>
      <app-code-viewer [code]="fieldCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>Validation State</h2>
      <p>
        The input sets <code>aria-invalid="true"</code> when invalid — keyed on ARIA rather than
        a parallel class. The thicker border and red color follow from the attribute.
      </p>
      <div class="demo-box">
        <div class="demo-preview">
          <input class="demo-input demo-input--invalid" type="email" value="not-an-email" aria-invalid="true" />
        </div>
      </div>
      <app-code-viewer [code]="invalidCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>Two-Way Binding</h2>
      <app-code-viewer [code]="bindingCode" language="typescript" label="TypeScript" />
    </section>

    <section class="doc-section">
      <h2>API Reference</h2>
      <div class="api-table">
        <table>
          <thead><tr><th>Input/Output</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>value</code></td><td><code>ModelSignal&lt;string&gt;</code></td><td><code>''</code></td><td>Two-way bindable value</td></tr>
            <tr><td><code>disabled</code></td><td><code>InputSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Disable the control</td></tr>
            <tr><td><code>readonly</code></td><td><code>InputSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Read-only mode</td></tr>
            <tr><td><code>required</code></td><td><code>InputSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Mark as required</td></tr>
            <tr><td><code>invalid</code></td><td><code>InputSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Mark as invalid</td></tr>
            <tr><td><code>touch</code></td><td><code>OutputRef&lt;void&gt;</code></td><td>—</td><td>Emitted on blur</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } p { color: var(--tk-on-surface-variant); line-height: 1.7; margin-bottom: 1rem; } app-code-viewer { margin-bottom: 1rem; } }
    .demo-box { margin-bottom: 1rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg); overflow: hidden; }
    .demo-preview { padding: 2rem; background: var(--tk-surface-variant); }
    .demo-input { display: block; width: 100%; max-width: 360px; padding: 0.5rem 0.75rem; min-height: 44px; border: 1px solid var(--tk-outline); border-radius: var(--tk-radius-md); background: var(--tk-surface); color: var(--tk-on-surface); font-family: var(--tk-font-sans); font-size: 0.9375rem; outline: none; transition: border-color 0.15s;
      &:focus { border-color: var(--tk-primary); box-shadow: 0 0 0 2px rgba(43, 92, 238, 0.15); }
      &--invalid { border-color: var(--tk-danger); border-width: 2px; }
    }
    .demo-field { max-width: 360px; }
    .demo-field__label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.375rem; }
    .demo-field__hint { display: block; font-size: 0.8125rem; color: var(--tk-on-surface-variant); margin-top: 0.375rem; }
    .api-table { overflow-x: auto; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg);
      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 0.75rem 1rem; background: var(--tk-surface-variant); font-weight: 600; font-size: 0.8125rem; border-bottom: 1px solid var(--tk-outline-variant); }
      td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--tk-outline-variant); color: var(--tk-on-surface-variant); }
      tr:last-child td { border-bottom: none; }
    }
  `],
})
export class InputDocComponent {
  readonly importCode = `import { TekadInput } from '@tekad/input';

@Component({
  standalone: true,
  imports: [TekadInput],
  template: \`<input tkInput [(value)]="name" />\`,
})
export class MyComponent {
  name = '';
}`;

  readonly basicCode = `<input tkInput [(value)]="name" placeholder="Enter your name" />`;

  readonly fieldCode = `<tk-form-field label="Email address">
  <input tkInput [(value)]="email" type="email" />
  <tk-field-hint>We will never share your email.</tk-field-hint>
</tk-form-field>`;

  readonly invalidCode = `<tk-form-field label="Email">
  <input tkInput [(value)]="email" [invalid]="hasError()" />
  @if (hasError()) {
    <tk-field-error>Enter a valid email address.</tk-field-error>
  }
</tk-form-field>`;

  readonly bindingCode = `import { signal } from '@angular/core';

@Component({
  template: \`
    <input tkInput [(value)]="search" placeholder="Search..." />
    <p>Searching for: {{ search() }}</p>
  \`,
})
export class MyComponent {
  search = signal('');
}`;
}
