import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-button-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Button"
      package="@tekad/button"
      selector="button[tkButton]"
      description="A button that decorates a native &lt;button&gt; element. Three appearances, a 44px minimum hit target, and an outline focus ring."
      [tags]="['Standalone', 'Signals', 'Native Element', 'Forced Colors']"
    />

    <section class="doc-section">
      <h2>Import</h2>
      <app-code-viewer [code]="importCode" language="typescript" label="TypeScript" />
    </section>

    <section class="doc-section">
      <h2>Basic Usage</h2>
      <div class="demo-box">
        <div class="demo-preview">
          <button class="demo-btn demo-btn--filled">Filled</button>
          <button class="demo-btn demo-btn--outlined">Outlined</button>
          <button class="demo-btn demo-btn--text">Text</button>
        </div>
      </div>
      <app-code-viewer [code]="basicCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>Appearances</h2>
      <p>
        Three, and no more. <code>filled</code> for the primary action, <code>outlined</code> for
        secondary, <code>text</code> for tertiary. Each appearance re-points the component
        tokens — no appearance redeclares layout.
      </p>
      <div class="demo-box">
        <div class="demo-preview">
          <button class="demo-btn demo-btn--filled">Filled (Default)</button>
          <button class="demo-btn demo-btn--outlined">Outlined</button>
          <button class="demo-btn demo-btn--text">Text</button>
        </div>
      </div>
      <app-code-viewer [code]="appearancesCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>Destructive Button</h2>
      <p>
        No <code>tone</code> or <code>color</code> input. A destructive button overrides
        the component tokens — reaching colours TEKAD never anticipated without waiting for a release.
      </p>
      <div class="demo-box">
        <div class="demo-preview">
          <button class="demo-btn demo-btn--danger">Delete Item</button>
          <button class="demo-btn demo-btn--danger-outline">Remove</button>
        </div>
      </div>
      <app-code-viewer [code]="destructiveCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>Disabled State</h2>
      <p>
        Uses native <code>disabled</code> — the button is removed from the tab order and
        the accessibility tree. Opacity at 0.38 (exempt from WCAG 1.4.3 contrast).
      </p>
      <div class="demo-box">
        <div class="demo-preview">
          <button class="demo-btn demo-btn--filled" disabled>Filled</button>
          <button class="demo-btn demo-btn--outlined" disabled>Outlined</button>
          <button class="demo-btn demo-btn--text" disabled>Text</button>
        </div>
      </div>
      <app-code-viewer [code]="disabledCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>Button Types</h2>
      <p>
        Defaults to <code>type="button"</code> on purpose. An unset type inside a <code>&lt;form&gt;</code>
        means <code>submit</code> — so a "Cancel" without a type submits the form.
      </p>
      <app-code-viewer [code]="typeCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>API Reference</h2>
      <div class="api-table">
        <table>
          <thead>
            <tr>
              <th>Input</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>appearance</code></td>
              <td><code>'filled' | 'outlined' | 'text'</code></td>
              <td><code>'filled'</code></td>
              <td>How the button presents itself</td>
            </tr>
            <tr>
              <td><code>type</code></td>
              <td><code>'button' | 'submit' | 'reset'</code></td>
              <td><code>'button'</code></td>
              <td>Native button type. Defaulted to prevent accidental form submission.</td>
            </tr>
            <tr>
              <td><code>id</code></td>
              <td><code>string | undefined</code></td>
              <td><code>undefined</code></td>
              <td>Explicit id; otherwise one is generated via uniqueId()</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2>Component Tokens</h2>
      <p>Override these on the host or any ancestor to customize the button's appearance:</p>
      <div class="api-table">
        <table>
          <thead>
            <tr><th>Token</th><th>Default</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>--tekad-button-background</code></td><td><code>transparent</code></td><td>Background color</td></tr>
            <tr><td><code>--tekad-button-foreground</code></td><td><code>var(--tekad-sys-color-primary)</code></td><td>Text and icon color</td></tr>
            <tr><td><code>--tekad-button-border-color</code></td><td><code>transparent</code></td><td>Border color</td></tr>
            <tr><td><code>--tekad-button-radius</code></td><td><code>var(--tekad-sys-radius-md)</code></td><td>Border radius</td></tr>
            <tr><td><code>--tekad-button-min-size</code></td><td><code>2.75rem</code></td><td>Minimum block size (44px at density 1)</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .doc-section {
      margin-bottom: 3rem;
      h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; letter-spacing: -0.02em; }
      p { color: var(--tk-on-surface-variant); line-height: 1.7; margin-bottom: 1rem; }
      app-code-viewer { margin-bottom: 1rem; }
    }

    .demo-box {
      margin-bottom: 1rem;
      border: 1px solid var(--tk-outline-variant);
      border-radius: var(--tk-radius-lg);
      overflow: hidden;
    }

    .demo-preview {
      padding: 2rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      background: var(--tk-surface-variant);
    }

    .demo-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem 1.25rem;
      min-height: 44px;
      border-radius: var(--tk-radius-md);
      font-family: var(--tk-font-sans);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;

      &--filled {
        background: var(--tk-primary);
        color: var(--tk-on-primary);
        &:hover:not(:disabled) { filter: brightness(1.1); }
      }
      &--outlined {
        background: transparent;
        color: var(--tk-primary);
        border-color: var(--tk-outline);
        &:hover:not(:disabled) { background: var(--tk-primary-container); }
      }
      &--text {
        background: transparent;
        color: var(--tk-primary);
        &:hover:not(:disabled) { background: var(--tk-primary-container); }
      }
      &--danger {
        background: var(--tk-danger);
        color: white;
        &:hover:not(:disabled) { filter: brightness(1.1); }
      }
      &--danger-outline {
        background: transparent;
        color: var(--tk-danger);
        border-color: var(--tk-danger);
        &:hover:not(:disabled) { background: rgba(220, 38, 38, 0.05); }
      }
      &:disabled { opacity: 0.38; cursor: not-allowed; }
    }

    .api-table {
      overflow-x: auto;
      border: 1px solid var(--tk-outline-variant);
      border-radius: var(--tk-radius-lg);

      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 0.75rem 1rem; background: var(--tk-surface-variant); font-weight: 600; font-size: 0.8125rem; border-bottom: 1px solid var(--tk-outline-variant); }
      td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--tk-outline-variant); color: var(--tk-on-surface-variant); }
      tr:last-child td { border-bottom: none; }
    }
  `],
})
export class ButtonDocComponent {
  readonly importCode = `import { TekadButton } from '@tekad/button';

@Component({
  standalone: true,
  imports: [TekadButton],
  template: \`<button tkButton>Click me</button>\`,
})
export class MyComponent {}`;

  readonly basicCode = `<button tkButton>Default (Filled)</button>
<button tkButton appearance="outlined">Outlined</button>
<button tkButton appearance="text">Text</button>`;

  readonly appearancesCode = `<!-- Filled — the primary action -->
<button tkButton appearance="filled">Save Changes</button>

<!-- Outlined — secondary action -->
<button tkButton appearance="outlined">Cancel</button>

<!-- Text — tertiary, low emphasis -->
<button tkButton appearance="text">Learn more</button>`;

  readonly destructiveCode = `<!-- Override component tokens for destructive actions -->
<button tkButton
  style="--tekad-button-background: var(--tekad-sys-color-danger);
         --tekad-button-foreground: var(--tekad-sys-color-on-danger)">
  Delete Item
</button>

<!-- Or with a class -->
<button tkButton class="btn-danger">Remove</button>

<style>
  .btn-danger {
    --tekad-button-background: transparent;
    --tekad-button-foreground: var(--tekad-sys-color-danger);
    --tekad-button-border-color: var(--tekad-sys-color-danger);
  }
</style>`;

  readonly disabledCode = `<button tkButton disabled>Disabled Filled</button>
<button tkButton appearance="outlined" disabled>Disabled Outlined</button>
<button tkButton appearance="text" disabled>Disabled Text</button>`;

  readonly typeCode = `<!-- Default: type="button" — will NOT submit a form -->
<button tkButton>Click me</button>

<!-- Explicit submit button for forms -->
<button tkButton type="submit">Submit Form</button>

<!-- Reset button -->
<button tkButton type="reset" appearance="text">Reset</button>`;
}
