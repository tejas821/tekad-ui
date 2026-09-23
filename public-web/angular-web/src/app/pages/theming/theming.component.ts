import { Component } from '@angular/core';
import { CodeViewer } from '../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-theming',
  standalone: true,
  imports: [CodeViewer],
  template: `
    <div class="theming-page">
      <div class="page-header">
        <h1>Theming</h1>
        <p class="page-header__desc">
          TEKAD uses a three-tier design token architecture with CSS custom properties.
          Light/dark mode, density scaling, and RTL are all built in.
        </p>
      </div>

      <section class="doc-section">
        <h2>CSS Layers</h2>
        <p>
          All TEKAD styles live in <code>&#64;layer tekad.components</code>. Your unlayered CSS
          always wins — no <code>!important</code> needed, no <code>::ng-deep</code> hacks.
        </p>
        <app-code-viewer [code]="layerCode" language="css" label="CSS" />
        <div class="callout">
          <p>
            <strong>Layer order is fixed by first appearance.</strong> The layer declaration in
            <code>tekad.css</code> must be the first statement, and it is.
          </p>
        </div>
      </section>

      <section class="doc-section">
        <h2>Color Scheme</h2>
        <p>
          TEKAD uses <code>light-dark()</code> for automatic light/dark switching based on
          <code>color-scheme</code>. You can also force a specific scheme on any element.
        </p>

        <div class="theme-demo">
          <div class="theme-swatch" data-tekad-scheme="light">
            <span class="theme-swatch__label">Light</span>
            <div class="theme-swatch__colors">
              <div class="swatch" style="background: #ffffff; border: 1px solid #ddd;"></div>
              <div class="swatch" style="background: #22428d;"></div>
              <div class="swatch" style="background: #831a18;"></div>
              <div class="swatch" style="background: #0a5722;"></div>
            </div>
          </div>
          <div class="theme-swatch theme-swatch--dark" data-tekad-scheme="dark">
            <span class="theme-swatch__label">Dark</span>
            <div class="theme-swatch__colors">
              <div class="swatch" style="background: #030304; border: 1px solid #333;"></div>
              <div class="swatch" style="background: #a0bef9;"></div>
              <div class="swatch" style="background: #f7a59c;"></div>
              <div class="swatch" style="background: #9ccca2;"></div>
            </div>
          </div>
        </div>

        <app-code-viewer [code]="schemeCode" language="html" label="HTML" />
      </section>

      <section class="doc-section">
        <h2>Density Scaling</h2>
        <p>
          Density is a single multiplier — <code>--tekad-sys-density-scale</code>. Components
          multiply their spacing by it. Changing density adds no CSS at all.
        </p>
        <div class="density-demo">
          <div class="density-item">
            <span class="density-label">Comfortable (1.25)</span>
            <button class="demo-btn density-comfortable">Button</button>
          </div>
          <div class="density-item">
            <span class="density-label">Default (1.0)</span>
            <button class="demo-btn density-default">Button</button>
          </div>
          <div class="density-item">
            <span class="density-label">Compact (0.875)</span>
            <button class="demo-btn density-compact">Button</button>
          </div>
        </div>
        <app-code-viewer [code]="densityCode" language="css" label="CSS" />
      </section>

      <section class="doc-section">
        <h2>Custom Brand Colors</h2>
        <p>
          Override the semantic tokens at <code>:root</code> to set your brand colors.
          All components will pick up the new palette automatically.
        </p>
        <app-code-viewer [code]="brandCode" language="css" label="CSS" />
      </section>

      <section class="doc-section">
        <h2>Component Token Override</h2>
        <p>
          Each component exposes its own tokens (<code>--tekad-button-*</code>, etc.).
          Override them on any ancestor to scope the change.
        </p>
        <app-code-viewer [code]="componentTokenCode" language="css" label="CSS" />
      </section>

      <section class="doc-section">
        <h2>Forced Colors (High Contrast)</h2>
        <p>
          Every TEKAD component has a <code>&#64;media (forced-colors: active)</code> block.
          In Windows High Contrast mode, hand-drawn visuals are removed and the UA's own
          rendering takes over — because it knows the user's palette.
        </p>
        <div class="callout">
          <p>
            <strong>Key principle:</strong> <code>outline</code> over <code>box-shadow</code> for focus
            rings. Box-shadow is dropped in forced-colors mode — outline is preserved.
          </p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid var(--tk-outline-variant);
      h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.75rem; background: linear-gradient(135deg, var(--tk-primary), var(--tk-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    }
    .page-header__desc { font-size: 1.125rem; color: var(--tk-on-surface-variant); line-height: 1.7; max-width: 640px; }
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } p { color: var(--tk-on-surface-variant); line-height: 1.7; margin-bottom: 1rem; } app-code-viewer { margin-bottom: 1rem; } }
    .callout { padding: 1rem 1.25rem; background: var(--tk-primary-container); border-radius: var(--tk-radius-md); border-left: 3px solid var(--tk-primary);
      p { color: var(--tk-on-primary-container); margin: 0; font-size: 0.875rem; }
    }
    .theme-demo { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .theme-swatch { flex: 1; padding: 1.25rem; border-radius: var(--tk-radius-lg); border: 1px solid var(--tk-outline-variant);
      &--dark { background: #1a1d27; .theme-swatch__label { color: #e4e6ed; } }
    }
    .theme-swatch__label { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; display: block; }
    .theme-swatch__colors { display: flex; gap: 0.5rem; }
    .swatch { width: 36px; height: 36px; border-radius: var(--tk-radius-md); }
    .density-demo { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem; padding: 1.5rem; background: var(--tk-surface-variant); border-radius: var(--tk-radius-lg); }
    .density-item { display: flex; align-items: center; gap: 1rem; }
    .density-label { font-size: 0.8125rem; font-weight: 500; color: var(--tk-on-surface-variant); min-width: 140px; }
    .demo-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; background: var(--tk-primary); color: var(--tk-on-primary); border: none; border-radius: var(--tk-radius-md); font-family: var(--tk-font-sans); font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    .density-comfortable { padding: 0.75rem 1.5rem; min-height: 52px; }
    .density-default { min-height: 44px; }
    .density-compact { padding: 0.375rem 0.75rem; min-height: 36px; font-size: 0.8125rem; }
    @media (max-width: 640px) { .theme-demo { flex-direction: column; } }
  `],
})
export class ThemingComponent {
  readonly layerCode = `/* TEKAD declares its layers first */
@layer tekad.reset, tekad.base, tekad.components, tekad.utilities;

/* Your unlayered CSS always wins: */
.my-app button {
  background: red;  /* Wins over any TEKAD rule, no !important needed */
}`;

  readonly schemeCode = `<!-- System preference (default) -->
<html> <!-- color-scheme: light dark -->

<!-- Force light on a subtree -->
<div data-tekad-scheme="light">...</div>

<!-- Force dark on a subtree -->
<div data-tekad-scheme="dark">...</div>`;

  readonly densityCode = `/* Compact density */
:root {
  --tekad-sys-density-scale: 0.875;
}

/* Comfortable density */
:root {
  --tekad-sys-density-scale: 1.25;
}

/* Scope to a section */
.dense-table {
  --tekad-sys-density-scale: 0.75;
}`;

  readonly brandCode = `:root {
  /* Override the primary palette */
  --tekad-sys-color-primary: #7c3aed;
  --tekad-sys-color-on-primary: #ffffff;
  --tekad-sys-color-primary-container: #ede9fe;
  --tekad-sys-color-on-primary-container: #1e1b4b;

  /* And the focus ring to match */
  --tekad-sys-color-focus-ring: #7c3aed;
}`;

  readonly componentTokenCode = `/* Override for all buttons in a section */
.admin-panel {
  --tekad-button-radius: var(--tk-radius-full);
  --tekad-button-min-size: 3rem;
}

/* Override for a specific button */
button.cta {
  --tekad-button-background: linear-gradient(135deg, #7c3aed, #2b5cee);
  --tekad-button-foreground: white;
}`;
}
