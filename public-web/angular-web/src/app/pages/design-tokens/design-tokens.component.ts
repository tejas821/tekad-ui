import { Component } from '@angular/core';
import { CodeViewer } from '../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-design-tokens',
  standalone: true,
  imports: [CodeViewer],
  template: `
    <div class="tokens-page">
      <div class="page-header">
        <h1>Design Tokens</h1>
        <p class="page-header__desc">
          The semantic token tier — <code>--tekad-sys-*</code> — is the public API.
          Primitives are resolved at build time and never shipped.
        </p>
      </div>

      <section class="doc-section">
        <h2>Color Tokens</h2>
        <p>Semantic colors that respond automatically to <code>color-scheme</code>.</p>

        <div class="token-grid">
          @for (token of colorTokens; track token.name) {
            <div class="token-card">
              <div class="token-card__preview" [style.background]="token.preview"></div>
              <div class="token-card__info">
                <code class="token-card__name">{{ token.name }}</code>
                <span class="token-card__desc">{{ token.desc }}</span>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="doc-section">
        <h2>Spacing Tokens</h2>
        <p>A 4px step expressed in rem, tracking the user's font size.</p>
        <div class="spacing-demo">
          @for (space of spacingTokens; track space.name) {
            <div class="spacing-row">
              <code class="spacing-name">{{ space.name }}</code>
              <div class="spacing-bar" [style.width]="space.value"></div>
              <span class="spacing-value">{{ space.value }}</span>
            </div>
          }
        </div>
      </section>

      <section class="doc-section">
        <h2>Border Radius Tokens</h2>
        <div class="radius-demo">
          @for (r of radiusTokens; track r.name) {
            <div class="radius-item">
              <div class="radius-box" [style.border-radius]="r.value"></div>
              <code>{{ r.name }}</code>
              <span class="radius-value">{{ r.value }}</span>
            </div>
          }
        </div>
      </section>

      <section class="doc-section">
        <h2>Full Token Reference</h2>
        <app-code-viewer [code]="allTokens" language="css" label="CSS" />
      </section>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid var(--tk-outline-variant);
      h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.75rem; background: linear-gradient(135deg, var(--tk-primary), var(--tk-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    }
    .page-header__desc { font-size: 1.125rem; color: var(--tk-on-surface-variant); line-height: 1.7; max-width: 640px; }
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } p { color: var(--tk-on-surface-variant); line-height: 1.7; margin-bottom: 1rem; } }
    .token-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
    .token-card { display: flex; gap: 0.75rem; padding: 0.75rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-md); align-items: center; }
    .token-card__preview { width: 40px; height: 40px; border-radius: var(--tk-radius-sm); flex-shrink: 0; border: 1px solid var(--tk-outline-variant); }
    .token-card__info { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
    .token-card__name { font-size: 0.75rem; font-weight: 600; color: var(--tk-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .token-card__desc { font-size: 0.75rem; color: var(--tk-on-surface-variant); }
    .spacing-demo { display: flex; flex-direction: column; gap: 0.5rem; }
    .spacing-row { display: flex; align-items: center; gap: 0.75rem; }
    .spacing-name { font-size: 0.75rem; font-weight: 600; min-width: 130px; color: var(--tk-primary); }
    .spacing-bar { height: 20px; background: var(--tk-primary); border-radius: 2px; min-width: 4px; }
    .spacing-value { font-size: 0.75rem; color: var(--tk-on-surface-variant); }
    .radius-demo { display: flex; flex-wrap: wrap; gap: 1.5rem; }
    .radius-item { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .radius-box { width: 60px; height: 60px; background: var(--tk-primary); }
    .radius-item code { font-size: 0.6875rem; }
    .radius-value { font-size: 0.6875rem; color: var(--tk-on-surface-variant); }
  `],
})
export class DesignTokensComponent {
  readonly colorTokens = [
    { name: '--tekad-sys-color-surface', desc: 'Page background', preview: '#ffffff' },
    { name: '--tekad-sys-color-on-surface', desc: 'Body text', preview: '#030304' },
    { name: '--tekad-sys-color-primary', desc: 'Main action color', preview: '#22428d' },
    { name: '--tekad-sys-color-on-primary', desc: 'On primary', preview: '#ffffff' },
    { name: '--tekad-sys-color-danger', desc: 'Errors, destructive', preview: '#831a18' },
    { name: '--tekad-sys-color-success', desc: 'Success states', preview: '#0a5722' },
    { name: '--tekad-sys-color-warning', desc: 'Warnings', preview: '#624000' },
    { name: '--tekad-sys-color-outline', desc: 'Borders, 3:1 contrast', preview: '#626366' },
    { name: '--tekad-sys-color-focus-ring', desc: 'Focus indicators', preview: '#22428d' },
    { name: '--tekad-sys-color-surface-variant', desc: 'Recessed backgrounds', preview: '#eeeeef' },
    { name: '--tekad-sys-color-on-surface-variant', desc: 'Secondary text', preview: '#2d2e30' },
    { name: '--tekad-sys-color-outline-variant', desc: 'Decorative dividers', preview: '#dddedf' },
  ];

  readonly spacingTokens = [
    { name: '--tekad-sys-space-1', value: '0.25rem' },
    { name: '--tekad-sys-space-2', value: '0.5rem' },
    { name: '--tekad-sys-space-3', value: '0.75rem' },
    { name: '--tekad-sys-space-4', value: '1rem' },
    { name: '--tekad-sys-space-5', value: '1.5rem' },
    { name: '--tekad-sys-space-6', value: '2rem' },
    { name: '--tekad-sys-space-7', value: '3rem' },
  ];

  readonly radiusTokens = [
    { name: '--tekad-sys-radius-none', value: '0' },
    { name: '--tekad-sys-radius-sm', value: '0.25rem' },
    { name: '--tekad-sys-radius-md', value: '0.5rem' },
    { name: '--tekad-sys-radius-lg', value: '1rem' },
    { name: '--tekad-sys-radius-full', value: '9999px' },
  ];

  readonly allTokens = `:root {
  /* Colors — light-dark() resolves per color-scheme */
  --tekad-sys-color-surface: light-dark(#ffffff, #030304);
  --tekad-sys-color-on-surface: light-dark(#030304, #eeeeef);
  --tekad-sys-color-surface-variant: light-dark(#eeeeef, #151617);
  --tekad-sys-color-on-surface-variant: light-dark(#2d2e30, #bdbebf);
  --tekad-sys-color-primary: light-dark(#22428d, #a0bef9);
  --tekad-sys-color-on-primary: light-dark(#ffffff, #02103e);
  --tekad-sys-color-primary-container: light-dark(#cedeff, #0d2767);
  --tekad-sys-color-on-primary-container: light-dark(#02103e, #cedeff);
  --tekad-sys-color-danger: light-dark(#831a18, #f7a59c);
  --tekad-sys-color-on-danger: light-dark(#ffffff, #320001);
  --tekad-sys-color-success: light-dark(#0a5722, #9ccca2);
  --tekad-sys-color-on-success: light-dark(#ffffff, #001d06);
  --tekad-sys-color-warning: light-dark(#624000, #deb680);
  --tekad-sys-color-on-warning: light-dark(#ffffff, #211300);
  --tekad-sys-color-outline: light-dark(#626366, #7f8083);
  --tekad-sys-color-outline-variant: light-dark(#dddedf, #2d2e30);
  --tekad-sys-color-focus-ring: light-dark(#22428d, #a0bef9);

  /* Spacing — 4px step in rem */
  --tekad-sys-space-0: 0;
  --tekad-sys-space-1: 0.25rem;
  --tekad-sys-space-2: 0.5rem;
  --tekad-sys-space-3: 0.75rem;
  --tekad-sys-space-4: 1rem;
  --tekad-sys-space-5: 1.5rem;
  --tekad-sys-space-6: 2rem;
  --tekad-sys-space-7: 3rem;

  /* Radius */
  --tekad-sys-radius-none: 0;
  --tekad-sys-radius-sm: 0.25rem;
  --tekad-sys-radius-md: 0.5rem;
  --tekad-sys-radius-lg: 1rem;
  --tekad-sys-radius-full: 9999px;

  /* Density — single multiplier */
  --tekad-sys-density-scale: 1;
}`;
}
