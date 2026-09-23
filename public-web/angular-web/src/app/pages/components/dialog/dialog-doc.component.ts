import { Component } from '@angular/core';
import { ComponentHeader } from '../../../shared/component-header/component-header.component';
import { CodeViewer } from '../../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-dialog-doc',
  standalone: true,
  imports: [ComponentHeader, CodeViewer],
  template: `
    <app-component-header
      title="Dialog"
      package="@tekad/dialog"
      selector="tk-dialog"
      description="A modal dialog built on native &lt;dialog&gt; + showModal(). No hand-written focus trap — the platform provides it."
      [tags]="['Standalone', 'Signals', 'Native Dialog', 'Deferred Close']"
    />

    <section class="doc-section">
      <h2>Import</h2>
      <app-code-viewer [code]="importCode" language="typescript" label="TypeScript" />
    </section>

    <section class="doc-section">
      <h2>Basic Usage</h2>
      <div class="demo-box">
        <div class="demo-preview">
          <div class="demo-dialog">
            <div class="demo-dialog__heading">Delete this item?</div>
            <p class="demo-dialog__body">This action cannot be undone. The item will be permanently removed.</p>
            <div class="demo-dialog__actions">
              <button class="demo-btn demo-btn--text">Cancel</button>
              <button class="demo-btn demo-btn--danger">Delete</button>
            </div>
          </div>
        </div>
      </div>
      <app-code-viewer [code]="basicCode" language="html" label="HTML" />
    </section>

    <section class="doc-section">
      <h2>Opening and Closing</h2>
      <p>
        <code>open</code> is a <code>model()</code> signal — both read and write. The platform closes the
        dialog on Escape or backdrop click; the model reflects it automatically.
      </p>
      <app-code-viewer [code]="toggleCode" language="typescript" label="TypeScript" />
    </section>

    <section class="doc-section">
      <h2>What TEKAD Does NOT Build</h2>
      <div class="callout-grid">
        <div class="callout-item">
          <h4>Focus Trap</h4>
          <p><code>showModal()</code> traps focus natively. Tab never reaches elements outside the dialog.</p>
        </div>
        <div class="callout-item">
          <h4>Escape Handling</h4>
          <p>The platform closes on Escape and fires the <code>close</code> event.</p>
        </div>
        <div class="callout-item">
          <h4>Background Inertness</h4>
          <p>Modal dialogs make everything outside <code>inert</code> by specification.</p>
        </div>
        <div class="callout-item">
          <h4>aria-modal</h4>
          <p>The platform sets it. <code>showModal()</code> implies <code>aria-modal="true"</code>.</p>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Exit Animation</h2>
      <p>
        The one thing the platform cannot do: a top-layer element leaves the top layer the instant
        <code>close()</code> is called. TEKAD's deferred-close primitive holds the element there
        while the exit animation plays.
      </p>
      <app-code-viewer [code]="animationCode" language="scss" label="SCSS" />
    </section>

    <section class="doc-section">
      <h2>API Reference</h2>
      <div class="api-table">
        <table>
          <thead><tr><th>Input/Output</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>open</code></td><td><code>ModelSignal&lt;boolean&gt;</code></td><td><code>false</code></td><td>Two-way bindable open state</td></tr>
            <tr><td><code>heading</code></td><td><code>InputSignal&lt;string&gt;</code></td><td><code>''</code></td><td>Visible heading; also the dialog's accessible name via aria-labelledby</td></tr>
            <tr><td><code>closed</code></td><td><code>OutputRef&lt;void&gt;</code></td><td>—</td><td>Emitted after close animation finishes</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } p { color: var(--tk-on-surface-variant); line-height: 1.7; margin-bottom: 1rem; } app-code-viewer { margin-bottom: 1rem; } }
    .demo-box { margin-bottom: 1rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg); overflow: hidden; }
    .demo-preview { padding: 2rem; background: var(--tk-surface-variant); display: flex; justify-content: center; }
    .demo-dialog { background: var(--tk-surface); border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-xl); padding: 1.5rem; max-width: 400px; width: 100%; box-shadow: var(--tk-shadow-lg); }
    .demo-dialog__heading { font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; }
    .demo-dialog__body { font-size: 0.875rem; color: var(--tk-on-surface-variant); margin-bottom: 1.5rem; line-height: 1.6; }
    .demo-dialog__actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .demo-btn { display: inline-flex; align-items: center; padding: 0.5rem 1rem; min-height: 40px; border-radius: var(--tk-radius-md); font-family: var(--tk-font-sans); font-size: 0.875rem; font-weight: 600; cursor: pointer; border: 1px solid transparent;
      &--text { background: transparent; color: var(--tk-primary); }
      &--danger { background: var(--tk-danger); color: white; }
    }
    .callout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .callout-item { padding: 1rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-md);
      h4 { font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.375rem; }
      p { font-size: 0.8125rem; color: var(--tk-on-surface-variant); margin: 0; line-height: 1.5; }
    }
    .api-table { overflow-x: auto; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg);
      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 0.75rem 1rem; background: var(--tk-surface-variant); font-weight: 600; font-size: 0.8125rem; border-bottom: 1px solid var(--tk-outline-variant); }
      td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--tk-outline-variant); color: var(--tk-on-surface-variant); }
      tr:last-child td { border-bottom: none; }
    }
    @media (max-width: 640px) { .callout-grid { grid-template-columns: 1fr; } }
  `],
})
export class DialogDocComponent {
  readonly importCode = `import { TekadDialog } from '@tekad/dialog';
import { TekadButton } from '@tekad/button';

@Component({
  standalone: true,
  imports: [TekadDialog, TekadButton],
  templateUrl: './my.component.html',
})
export class MyComponent {
  confirming = signal(false);
}`;

  readonly basicCode = `<tk-dialog [(open)]="confirming" heading="Delete this item?">
  <p>This action cannot be undone.</p>
  <button tkButton appearance="text" (click)="confirming.set(false)">
    Cancel
  </button>
  <button tkButton (click)="onDelete()">Delete</button>
</tk-dialog>`;

  readonly toggleCode = `import { signal } from '@angular/core';

export class MyComponent {
  // model() signal — two-way binding
  confirming = signal(false);

  openDialog() {
    this.confirming.set(true);
  }

  // The platform closes on Escape; the model reflects it.
  // No manual close handler needed for Escape/backdrop.
}`;

  readonly animationCode = `/* The exit animation — scale down on close */
.tk-dialog {
  scale: 1;
  transition: scale 120ms ease-out;
}

.tk-dialog.closing {
  scale: 0.97;
}

@media (prefers-reduced-motion: reduce) {
  .tk-dialog { transition: none; }
}`;
}
