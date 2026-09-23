import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeSwitcher } from '../../shared/theme-switcher/theme-switcher.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ThemeSwitcher],
  template: `
    <header class="header">
      <div class="header__inner">
        <a routerLink="/" class="header__brand" (click)="mobileMenu.set(false)">
          <div class="header__logo">
            <svg viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#hg)"/>
              <path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="32" y2="32">
                  <stop stop-color="#2b5cee"/><stop offset="1" stop-color="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="header__text">
            <span class="header__name">TEKAD</span>
            <span class="header__label">UI</span>
          </div>
        </a>

        <nav class="header__nav" aria-label="Main navigation">
          <a routerLink="/getting-started" routerLinkActive="header__link--active" class="header__link">Guide</a>
          <a routerLink="/components" routerLinkActive="header__link--active" class="header__link">Components</a>
          <a routerLink="/theming" routerLinkActive="header__link--active" class="header__link">Theming</a>
          <a routerLink="/accessibility" routerLinkActive="header__link--active" class="header__link">Accessibility</a>
          <a routerLink="/highlights" routerLinkActive="header__link--active" class="header__link">Highlights</a>
        </nav>

        <div class="header__actions">
          <app-theme-switcher />
          <a href="https://github.com/tejas821/tekad-ui" target="_blank" rel="noopener" class="header__gh" aria-label="GitHub">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </a>
          <a routerLink="/getting-started" class="header__cta">Get Started</a>
        </div>

        <button class="header__menu-btn" (click)="mobileMenu.set(!mobileMenu())" [attr.aria-expanded]="mobileMenu()" aria-label="Toggle navigation menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            @if (mobileMenu()) {
              <path d="M18 6L6 18M6 6l12 12"/>
            } @else {
              <path d="M3 6h18M3 12h18M3 18h18"/>
            }
          </svg>
        </button>
      </div>
    </header>

    <!-- Mobile Menu Overlay -->
    @if (mobileMenu()) {
      <div class="mobile-overlay" (click)="mobileMenu.set(false)"></div>
    }

    <!-- Mobile Menu Drawer -->
    <aside class="mobile-menu" [class.mobile-menu--open]="mobileMenu()">
      <div class="mobile-menu__header">
        <span class="mobile-menu__title">Navigation</span>
        <button class="mobile-menu__close" (click)="mobileMenu.set(false)" aria-label="Close menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <nav class="mobile-menu__nav" (click)="mobileMenu.set(false)">
        <div class="mobile-menu__section">
          <div class="mobile-menu__section-title">Main</div>
          <a routerLink="/" routerLinkActive="mobile-menu__link--active" [routerLinkActiveOptions]="{exact:true}" class="mobile-menu__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            Home
          </a>
          <a routerLink="/getting-started" routerLinkActive="mobile-menu__link--active" class="mobile-menu__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            Getting Started
          </a>
          <a routerLink="/components" routerLinkActive="mobile-menu__link--active" class="mobile-menu__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Components
          </a>
          <a routerLink="/highlights" routerLinkActive="mobile-menu__link--active" class="mobile-menu__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Highlights
          </a>
        </div>

        <div class="mobile-menu__section">
          <div class="mobile-menu__section-title">Foundation</div>
          <a routerLink="/theming" routerLinkActive="mobile-menu__link--active" class="mobile-menu__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m7-13h-6m-6 0H1"/></svg>
            Theming
          </a>
          <a routerLink="/design-tokens" routerLinkActive="mobile-menu__link--active" class="mobile-menu__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
            Design Tokens
          </a>
          <a routerLink="/accessibility" routerLinkActive="mobile-menu__link--active" class="mobile-menu__link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Accessibility
          </a>
        </div>

        <div class="mobile-menu__section">
          <div class="mobile-menu__section-title">Components</div>
          @for (comp of mobileComponents; track comp.path) {
            <a [routerLink]="comp.path" routerLinkActive="mobile-menu__link--active" class="mobile-menu__link mobile-menu__link--sub">
              {{ comp.label }}
            </a>
          }
        </div>
      </nav>

      <div class="mobile-menu__footer">
        <app-theme-switcher />
        <a href="https://github.com/tejas821/tekad-ui" target="_blank" rel="noopener" class="mobile-menu__gh">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          GitHub
        </a>
      </div>
    </aside>
  `,
  styles: [`
    .header {
      position: sticky; top: 0; z-index: 100;
      background: rgba(255,255,255,0.85); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--tk-outline-variant); height: var(--tk-header-height);
    }
    [data-theme="dark"] .header { background: rgba(15,17,23,0.85); }
    .header__inner {
      max-width: 1400px; margin: 0 auto; padding: 0 1.5rem;
      height: 100%; display: flex; align-items: center; gap: 2rem;
    }
    .header__brand {
      display: flex; align-items: center; gap: 0.625rem;
      text-decoration: none; color: var(--tk-on-surface); flex-shrink: 0;
    }
    .header__brand:hover { text-decoration: none; }
    .header__logo svg { width: 32px; height: 32px; }
    .header__text { display: flex; align-items: baseline; gap: 0.25rem; }
    .header__name { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.03em; }
    .header__label { font-size: 0.875rem; font-weight: 500; color: var(--tk-primary); }
    .header__nav { display: flex; align-items: center; gap: 0.25rem; margin-left: auto; }
    .header__link {
      padding: 0.5rem 0.75rem; font-size: 0.875rem; font-weight: 500;
      color: var(--tk-on-surface-variant); text-decoration: none;
      border-radius: 8px; transition: all 0.15s;
    }
    .header__link:hover { color: var(--tk-on-surface); background: var(--tk-surface-variant); text-decoration: none; }
    .header__link--active { color: var(--tk-primary); background: var(--tk-primary-container); }
    .header__actions { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
    .header__gh {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 8px;
      color: var(--tk-on-surface-variant); transition: all 0.15s;
    }
    .header__gh svg { width: 20px; height: 20px; }
    .header__gh:hover { color: var(--tk-on-surface); background: var(--tk-surface-variant); }
    .header__cta {
      display: inline-flex; align-items: center; padding: 0.5rem 1rem;
      background: var(--tk-primary); color: var(--tk-on-primary);
      border-radius: 8px; font-size: 0.875rem; font-weight: 600;
      text-decoration: none; transition: all 0.15s;
    }
    .header__cta:hover { opacity: 0.9; text-decoration: none; transform: translateY(-1px); }

    /* Hamburger button */
    .header__menu-btn {
      display: none; width: 40px; height: 40px;
      align-items: center; justify-content: center;
      border: none; background: var(--tk-surface-variant); color: var(--tk-on-surface);
      cursor: pointer; border-radius: 10px; margin-left: auto; flex-shrink: 0;
      transition: all 0.15s;
    }
    .header__menu-btn svg { width: 22px; height: 22px; }
    .header__menu-btn:hover { background: var(--tk-outline-variant); }

    /* Mobile overlay */
    .mobile-overlay {
      position: fixed; inset: 0; z-index: 199;
      background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* Mobile drawer */
    .mobile-menu {
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 200;
      width: min(320px, 85vw); background: var(--tk-surface);
      border-left: 1px solid var(--tk-outline-variant);
      box-shadow: -8px 0 32px rgba(0,0,0,0.1);
      display: flex; flex-direction: column;
      transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto;
    }
    .mobile-menu--open { transform: translateX(0); }

    .mobile-menu__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid var(--tk-outline-variant);
      flex-shrink: 0;
    }
    .mobile-menu__title { font-size: 0.9375rem; font-weight: 700; }
    .mobile-menu__close {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      border: none; background: var(--tk-surface-variant); color: var(--tk-on-surface);
      cursor: pointer; border-radius: 8px;
    }
    .mobile-menu__close svg { width: 18px; height: 18px; }

    .mobile-menu__nav { flex: 1; padding: 0.5rem 0; overflow-y: auto; }

    .mobile-menu__section { padding: 0.5rem 0; }
    .mobile-menu__section + .mobile-menu__section {
      border-top: 1px solid var(--tk-outline-variant);
    }
    .mobile-menu__section-title {
      padding: 0.5rem 1.25rem 0.25rem;
      font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--tk-on-surface-variant);
    }

    .mobile-menu__link {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.625rem 1.25rem; font-size: 0.9375rem; font-weight: 500;
      color: var(--tk-on-surface-variant); text-decoration: none;
      transition: all 0.12s;
    }
    .mobile-menu__link:hover { background: var(--tk-surface-variant); color: var(--tk-on-surface); text-decoration: none; }
    .mobile-menu__link--active { color: var(--tk-primary); background: var(--tk-primary-container); font-weight: 600; }
    .mobile-menu__link--sub { padding-left: 2.5rem; font-size: 0.875rem; }
    .mobile-menu__link svg { width: 18px; height: 18px; flex-shrink: 0; }

    .mobile-menu__footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-top: 1px solid var(--tk-outline-variant);
      flex-shrink: 0;
    }
    .mobile-menu__gh {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.875rem; color: var(--tk-on-surface-variant); text-decoration: none;
    }
    .mobile-menu__gh svg { width: 18px; height: 18px; }

    @media (max-width: 860px) {
      .header__nav, .header__cta, .header__gh { display: none; }
      .header__menu-btn { display: flex; }
    }
  `],
})
export class Header {
  readonly mobileMenu = signal(false);

  readonly mobileComponents = [
    { label: 'Button', path: '/components/button' },
    { label: 'Input', path: '/components/input' },
    { label: 'Checkbox', path: '/components/checkbox' },
    { label: 'Switch', path: '/components/switch' },
    { label: 'Select', path: '/components/select' },
    { label: 'Form Field', path: '/components/form-field' },
    { label: 'Dialog', path: '/components/dialog' },
    { label: 'Icon', path: '/components/icon' },
    { label: 'Badge', path: '/components/badge' },
    { label: 'Card', path: '/components/card' },
    { label: 'Divider', path: '/components/divider' },
    { label: 'Progress', path: '/components/progress' },
    { label: 'Tabs', path: '/components/tabs' },
    { label: 'Tooltip', path: '/components/tooltip' },
    { label: 'Table', path: '/components/table' },
  ];
}
