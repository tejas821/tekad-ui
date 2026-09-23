import { Component } from '@angular/core';
import { CodeViewer } from '../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [CodeViewer],
  template: `
    <div class="getting-started">
      <div class="page-header">
        <h1>Getting Started</h1>
        <p class="page-header__desc">
          Set up TEKAD UI in your Angular 22 project. The library uses standalone components
          exclusively — no NgModules required.
        </p>
      </div>

      <section class="doc-section">
        <h2>Prerequisites</h2>
        <ul class="doc-list">
          <li><strong>Node.js</strong> <code>^22.22.3 || ^24.15.0 || ^26.0.0</code></li>
          <li><strong>Angular</strong> 22 or later (standalone components)</li>
          <li><strong>pnpm</strong> 11.24+ (recommended) or npm</li>
        </ul>
      </section>

      <section class="doc-section">
        <h2>Installation</h2>
        <p>Install the core packages you need. Every TEKAD package is tree-shakeable and independently versioned.</p>
        <app-code-viewer
          [code]="installCode"
          language="bash"
          label="Terminal"
        />
      </section>

      <section class="doc-section">
        <h2>Import the Theme</h2>
        <p>
          Add the TEKAD theme stylesheet to your application. This provides the design tokens
          (colors, spacing, radii, density) that all components depend on.
        </p>
        <app-code-viewer
          [code]="themeImportCode"
          language="json"
          label="angular.json"
        />
        <p>Or import it directly in your global styles:</p>
        <app-code-viewer
          [code]="themeImportCss"
          language="scss"
          label="styles.scss"
        />
      </section>

      <section class="doc-section">
        <h2>Use a Component</h2>
        <p>
          Import any component directly in your standalone component. No module imports needed.
        </p>
        <app-code-viewer
          [code]="usageCode"
          language="typescript"
          label="app.component.ts"
        />
        <app-code-viewer
          [code]="usageTemplate"
          language="html"
          label="app.component.html"
        />
      </section>

      <section class="doc-section">
        <h2>Architecture Principles</h2>
        <div class="principles">
          <div class="principle">
            <h3>🎯 Native Elements First</h3>
            <p>
              TEKAD decorates native HTML elements rather than wrapping them. <code>button[tkButton]</code>
              is still a <code>&lt;button&gt;</code> — forced colours, keyboard behaviour, and form
              participation all work by default.
            </p>
          </div>
          <div class="principle">
            <h3>📦 Tree-Shakeable Packages</h3>
            <p>
              Each component is its own npm package. Import <code>&#64;tekad/button</code> and nothing
              else ships with it. No barrel imports, no side effects.
            </p>
          </div>
          <div class="principle">
            <h3>🎨 CSS Layers</h3>
            <p>
              All component styles live in <code>&#64;layer tekad.components</code>. Your unlayered CSS
              always wins — no <code>!important</code>, no <code>::ng-deep</code>.
            </p>
          </div>
          <div class="principle">
            <h3>♿ Accessibility Verified</h3>
            <p>
              Not just attributes — behaviour. Focus management, ARIA IDREFs, forced colours,
              and keyboard navigation are all tested in a real Chromium browser gate.
            </p>
          </div>
        </div>
      </section>

      <section class="doc-section">
        <h2>What's Next?</h2>
        <div class="next-steps">
          <a routerLink="/components" class="next-step">
            <span class="next-step__icon">📦</span>
            <span class="next-step__text">
              <strong>Browse Components</strong>
              <small>Explore all available components and their APIs</small>
            </span>
          </a>
          <a routerLink="/theming" class="next-step">
            <span class="next-step__icon">🎨</span>
            <span class="next-step__text">
              <strong>Theming Guide</strong>
              <small>Customize colors, density, and dark mode</small>
            </span>
          </a>
          <a routerLink="/accessibility" class="next-step">
            <span class="next-step__icon">♿</span>
            <span class="next-step__text">
              <strong>Accessibility</strong>
              <small>Learn about TEKAD's accessibility approach</small>
            </span>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--tk-outline-variant);

      h1 {
        font-size: 2.5rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        margin-bottom: 0.75rem;
        background: linear-gradient(135deg, var(--tk-primary), var(--tk-secondary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .page-header__desc {
      font-size: 1.125rem;
      color: var(--tk-on-surface-variant);
      line-height: 1.7;
      max-width: 640px;
    }

    .doc-section {
      margin-bottom: 3rem;

      h2 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        letter-spacing: -0.02em;
      }

      p {
        color: var(--tk-on-surface-variant);
        line-height: 1.7;
        margin-bottom: 1rem;
      }

      app-code-viewer {
        margin-bottom: 1rem;
      }
    }

    .doc-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      li {
        padding: 0.5rem 0.75rem;
        background: var(--tk-surface-variant);
        border-radius: var(--tk-radius-md);
        font-size: 0.9375rem;
      }
    }

    .principles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .principle {
      padding: 1.25rem;
      border: 1px solid var(--tk-outline-variant);
      border-radius: var(--tk-radius-lg);
      background: var(--tk-surface);

      h3 {
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }

      p {
        font-size: 0.875rem;
        color: var(--tk-on-surface-variant);
        line-height: 1.6;
        margin: 0;
      }
    }

    .next-steps {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .next-step {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border: 1px solid var(--tk-outline-variant);
      border-radius: var(--tk-radius-lg);
      text-decoration: none;
      color: var(--tk-on-surface);
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--tk-primary);
        background: var(--tk-primary-container);
        text-decoration: none;
        transform: translateX(4px);
      }
    }

    .next-step__icon {
      font-size: 1.5rem;
    }

    .next-step__text {
      display: flex;
      flex-direction: column;

      strong {
        font-size: 0.9375rem;
        font-weight: 600;
      }

      small {
        font-size: 0.8125rem;
        color: var(--tk-on-surface-variant);
      }
    }

    @media (max-width: 640px) {
      .principles { grid-template-columns: 1fr; }
      .page-header h1 { font-size: 2rem; }
    }
  `],
})
export class GettingStartedComponent {
  readonly installCode = `# Install the packages you need
pnpm add @tekad/theme @tekad/button @tekad/input @tekad/form-field

# Or with npm
npm install @tekad/theme @tekad/button @tekad/input @tekad/form-field`;

  readonly themeImportCode = `{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "options": {
            "styles": [
              "node_modules/@tekad/theme/styles/tekad.css",
              "src/styles.scss"
            ]
          }
        }
      }
    }
  }
}`;

  readonly themeImportCss = `@import '@tekad/theme/styles/tekad.css';

/* Your app styles below */`;

  readonly usageCode = `import { Component } from '@angular/core';
import { TekadButton } from '@tekad/button';
import { TekadInput } from '@tekad/input';
import { TekadFormField } from '@tekad/form-field';

@Component({
  standalone: true,
  imports: [TekadButton, TekadInput, TekadFormField],
  templateUrl: './app.component.html',
})
export class AppComponent {
  email = '';
}`;

  readonly usageTemplate = `<tk-form-field label="Email address">
  <input tkInput [(value)]="email" type="email" />
  <tk-field-hint>We will never share your email.</tk-field-hint>
</tk-form-field>

<button tkButton appearance="filled" (click)="submit()">
  Subscribe
</button>

<button tkButton appearance="outlined">
  Cancel
</button>`;
}
