import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-form-field-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Form Field"
      package="@tekad/form-field"
      selector="tk-form-field"
      description="Label, hint, and error text with automatic ARIA IDREF wiring. The field owns the accessibility plumbing so you don't have to."
      [tags]="['Standalone', 'Signals', 'ARIA IDREF', 'Content Projection']"
    />

    <section class="doc-section">
      <h2>Import</h2>
      <app-code-viewer [code]="importCode" language="typescript" label="TypeScript" />
    </section>

    <section class="doc-section">
      <h2>Basic Usage</h2>
      <div class="demo-box">
        <div class="demo-preview">
          <div class="demo-field">
            <label class="demo-field__label">Full name</label>
            <input class="demo-input" type="text" placeholder="John Doe" />
          </div>
        </div>
      </div>
      <app-code-viewer [code]="basicCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>With Hint Text</h2>
      <div class="demo-box">
        <div class="demo-preview">
          <div class="demo-field">
            <label class="demo-field__label">Password</label>
            <input class="demo-input" type="password" placeholder="••••••••" />
            <span class="demo-field__hint">Must be at least 8 characters long.</span>
          </div>
        </div>
      </div>
      <app-code-viewer [code]="hintCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>With Error Messages</h2>
      <p>
        When a <code>&lt;tk-field-error&gt;</code> is present, the field automatically sets
        <code>aria-invalid</code> on the control and includes the error in <code>aria-describedby</code>.
      </p>
      <div class="demo-box">
        <div class="demo-preview">
          <div class="demo-field">
            <label class="demo-field__label">Email</label>
            <input class="demo-input demo-input--invalid" type="email" value="not-valid" />
            <span class="demo-field__error">Enter a valid email address.</span>
          </div>
        </div>
      </div>
      <app-code-viewer [code]="errorCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>How the Wiring Works</h2>
      <div class="wiring-diagram">
        <div class="wiring__step">
          <div class="wiring__num">1</div>
          <div class="wiring__text">
            <strong>Control announces its ID</strong>
            <p>The input calls <code>setControlId()</code> on the field context during construction.</p>
          </div>
        </div>
        <div class="wiring__arrow">↓</div>
        <div class="wiring__step">
          <div class="wiring__num">2</div>
          <div class="wiring__text">
            <strong>Label points to control</strong>
            <p>The field sets <code>&lt;label for="..."&gt;</code> to the control's ID.</p>
          </div>
        </div>
        <div class="wiring__arrow">↓</div>
        <div class="wiring__step">
          <div class="wiring__num">3</div>
          <div class="wiring__text">
            <strong>Control reads describedBy</strong>
            <p>The input sets <code>aria-describedby</code> from the field's computed IDs (errors first, then hints).</p>
          </div>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <h2>API Reference</h2>
      <div class="api-table">
        <table>
          <thead><tr><th>Input</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>label</code></td><td><code>InputSignal&lt;string&gt;</code></td><td>The visible label text</td></tr>
          </tbody>
        </table>
      </div>
      <h3 style="margin-top: 1.5rem; margin-bottom: 0.75rem;">Content Projection</h3>
      <div class="api-table">
        <table>
          <thead><tr><th>Element</th><th>Selector</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Control</td><td>Any TEKAD form control</td><td>Projected by position; the control injects TEKAD_FIELD_CONTEXT</td></tr>
            <tr><td>Hint</td><td><code>&lt;tk-field-hint&gt;</code></td><td>Advisory text below the control</td></tr>
            <tr><td>Error</td><td><code>&lt;tk-field-error&gt;</code></td><td>Error message; presence marks the field as invalid</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } p { color: var(--tk-on-surface-variant); line-height: 1.7; margin-bottom: 1rem; } app-code-viewer { margin-bottom: 1rem; } }
    .demo-box { margin-bottom: 1rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg); overflow: hidden; }
    .demo-preview { padding: 2rem; background: var(--tk-surface-variant); }
    .demo-field { max-width: 360px; }
    .demo-field__label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.375rem; }
    .demo-field__hint { display: block; font-size: 0.8125rem; color: var(--tk-on-surface-variant); margin-top: 0.375rem; }
    .demo-field__error { display: block; font-size: 0.8125rem; color: var(--tk-danger); font-weight: 500; margin-top: 0.375rem; }
    .demo-input { display: block; width: 100%; padding: 0.5rem 0.75rem; min-height: 44px; border: 1px solid var(--tk-outline); border-radius: var(--tk-radius-md); background: var(--tk-surface); color: var(--tk-on-surface); font-family: var(--tk-font-sans); font-size: 0.9375rem; outline: none;
      &--invalid { border-color: var(--tk-danger); border-width: 2px; }
    }
    .wiring-diagram { padding: 1.5rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg); background: var(--tk-surface-variant); }
    .wiring__step { display: flex; gap: 1rem; align-items: flex-start; }
    .wiring__num { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--tk-primary); color: var(--tk-on-primary); border-radius: 50%; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
    .wiring__text { strong { font-size: 0.9375rem; } p { font-size: 0.8125rem; color: var(--tk-on-surface-variant); margin: 0.25rem 0 0; } }
    .wiring__arrow { text-align: center; padding: 0.25rem 0; color: var(--tk-on-surface-variant); font-size: 1.25rem; }
    .api-table { overflow-x: auto; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg);
      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 0.75rem 1rem; background: var(--tk-surface-variant); font-weight: 600; font-size: 0.8125rem; border-bottom: 1px solid var(--tk-outline-variant); }
      td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--tk-outline-variant); color: var(--tk-on-surface-variant); }
      tr:last-child td { border-bottom: none; }
    }
  `],
})
export class FormFieldDocComponent {
  readonly importCode = `import { TekadFormField, TekadFieldHint, TekadFieldError } from '@tekad/form-field';
import { TekadInput } from '@tekad/input';

@Component({
  standalone: true,
  imports: [TekadFormField, TekadFieldHint, TekadFieldError, TekadInput],
  templateUrl: './my.component.html',
})
export class MyComponent {}`;

  readonly basicCode = `<tk-form-field label="Full name">
  <input tkInput [(value)]="fullName" />
</tk-form-field>`;

  readonly hintCode = `<tk-form-field label="Password">
  <input tkInput [(value)]="password" type="password" />
  <tk-field-hint>Must be at least 8 characters long.</tk-field-hint>
</tk-form-field>`;

  readonly errorCode = `<tk-form-field label="Email">
  <input tkInput [(value)]="email" [invalid]="emailError()" />
  @if (emailError()) {
    <tk-field-error>Enter a valid email address.</tk-field-error>
  }
  <tk-field-hint>We will never share your email.</tk-field-hint>
</tk-form-field>`;
}
