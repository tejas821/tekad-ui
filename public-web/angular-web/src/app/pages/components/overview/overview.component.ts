import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="overview">
      <div class="page-header">
        <h1>Components</h1>
        <p class="page-header__desc">
          Every TEKAD component is a standalone Angular component that decorates native HTML
          elements where possible. No wrapper divs, no reimplemented behaviour. 15 components and growing.
        </p>
      </div>

      <div class="component-grid">
        @for (comp of components; track comp.name) {
          <a [routerLink]="comp.path" class="comp-card">
            <div class="comp-card__preview">
              <div class="comp-card__icon" [innerHTML]="comp.icon"></div>
            </div>
            <div class="comp-card__info">
              <code class="comp-card__pkg">{{ comp.pkg }}</code>
              <h3 class="comp-card__name">{{ comp.name }}</h3>
              <p class="comp-card__desc">{{ comp.desc }}</p>
            </div>
            <div class="comp-card__meta">
              <span class="comp-card__selector">{{ comp.selector }}</span>
            </div>
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 3rem;

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

    .component-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .comp-card {
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      border: 1px solid var(--tk-outline-variant);
      border-radius: var(--tk-radius-xl);
      text-decoration: none;
      color: var(--tk-on-surface);
      transition: all 0.2s ease;
      background: var(--tk-surface);

      &:hover {
        border-color: var(--tk-primary);
        box-shadow: var(--tk-shadow-md);
        transform: translateY(-3px);
        text-decoration: none;
      }
    }

    .comp-card__preview {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 80px;
      background: var(--tk-surface-variant);
      border-radius: var(--tk-radius-lg);
      margin-bottom: 1rem;
    }

    .comp-card__icon {
      color: var(--tk-primary);

      svg { width: 36px; height: 36px; }
    }

    .comp-card__pkg {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--tk-primary);
      background: var(--tk-primary-container);
      padding: 0.125rem 0.5rem;
      border-radius: var(--tk-radius-sm);
      display: inline-block;
      margin-bottom: 0.375rem;
    }

    .comp-card__name {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 0.375rem;
    }

    .comp-card__desc {
      font-size: 0.8125rem;
      color: var(--tk-on-surface-variant);
      line-height: 1.5;
      flex: 1;
    }

    .comp-card__meta {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--tk-outline-variant);
    }

    .comp-card__selector {
      font-family: var(--tk-font-mono);
      font-size: 0.75rem;
      color: var(--tk-on-surface-variant);
    }
  `],
})
export class OverviewComponent {
  readonly components = [
    {
      name: 'Button',
      pkg: '@tekad/button',
      path: '/components/button',
      desc: 'Three appearances — filled, outlined, text. 44px hit target. Decorates a native button element.',
      selector: 'button[tkButton]',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="8" width="18" height="8" rx="3"/><path d="M8 12h8"/></svg>',
    },
    {
      name: 'Input',
      pkg: '@tekad/input',
      path: '/components/input',
      desc: 'FormValueControl<string>. Decorates a native input with design tokens and field wiring.',
      selector: 'input[tkInput]',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9v6"/></svg>',
    },
    {
      name: 'Checkbox',
      pkg: '@tekad/checkbox',
      path: '/components/checkbox',
      desc: 'FormCheckboxControl. Native input with a painted box. Indeterminate state supported.',
      selector: 'tk-checkbox',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>',
    },
    {
      name: 'Switch',
      pkg: '@tekad/switch',
      path: '/components/switch',
      desc: 'A toggle switch on a native checkbox with role="switch". Track and thumb painted over the input.',
      selector: 'tk-switch',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="6" width="22" height="12" rx="6"/><circle cx="17" cy="12" r="4" fill="currentColor"/></svg>',
    },
    {
      name: 'Select',
      pkg: '@tekad/select',
      path: '/components/select',
      desc: 'A select control decorating a native <select>. FormValueControl<string> with field wiring.',
      selector: 'tk-select',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 10l4 4 4-4"/></svg>',
    },
    {
      name: 'Form Field',
      pkg: '@tekad/form-field',
      path: '/components/form-field',
      desc: 'Label, hint, and error text with automatic ARIA IDREF wiring to the control.',
      selector: 'tk-form-field',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    },
    {
      name: 'Dialog',
      pkg: '@tekad/dialog',
      path: '/components/dialog',
      desc: 'Native dialog + showModal(). Exit animations via deferred-close overlay primitive.',
      selector: 'tk-dialog',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/></svg>',
    },
    {
      name: 'Icon',
      pkg: '@tekad/icon',
      path: '/components/icon',
      desc: 'An inline SVG icon container. Provides sizing, color inheritance, and accessibility semantics.',
      selector: 'tk-icon',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    },
    {
      name: 'Badge',
      pkg: '@tekad/badge',
      path: '/components/badge',
      desc: 'A small count or status indicator. Tones: neutral, primary, success, warning, danger.',
      selector: 'tk-badge',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>',
    },
    {
      name: 'Card',
      pkg: '@tekad/card',
      path: '/components/card',
      desc: 'A content container with optional header and footer slots via content projection.',
      selector: 'tk-card',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>',
    },
    {
      name: 'Divider',
      pkg: '@tekad/divider',
      path: '/components/divider',
      desc: 'A visual separator. Decorates a native <hr>. Horizontal or vertical orientation.',
      selector: 'tk-divider',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12h18"/></svg>',
    },
    {
      name: 'Progress',
      pkg: '@tekad/progress',
      path: '/components/progress',
      desc: 'A determinate or indeterminate progress bar on a native <progress> element.',
      selector: 'tk-progress',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="10" width="20" height="4" rx="2"/><rect x="2" y="10" width="12" height="4" rx="2" fill="currentColor"/></svg>',
    },
    {
      name: 'Tabs',
      pkg: '@tekad/tabs',
      path: '/components/tabs',
      desc: 'A tabbed interface with WAI-ARIA tabs pattern and roving tabindex keyboard navigation.',
      selector: 'tk-tab-group',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v6"/></svg>',
    },
    {
      name: 'Tooltip',
      pkg: '@tekad/tooltip',
      path: '/components/tooltip',
      desc: 'A brief label shown on hover/focus. Uses role=tooltip and aria-describedby wiring.',
      selector: 'tk-tooltip',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21l4-4 4 4"/></svg>',
    },
    {
      name: 'Table',
      pkg: '@tekad/table',
      path: '/components/table',
      desc: 'A table foundation decorating native <table>. ADR-014: a cell is not a component.',
      selector: 'table[tkTable]',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
    },
  ];
}
