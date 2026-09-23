import { Component, signal, effect } from '@angular/core';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  template: `
    <button
      class="theme-switcher"
      (click)="toggle()"
      [attr.aria-label]="isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      @if (isDark()) {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      } @else {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      }
    </button>
  `,
  styles: [`
    .theme-switcher {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: none;
      color: var(--tk-on-surface-variant);
      cursor: pointer;
      border-radius: var(--tk-radius-md);
      transition: all 0.15s ease;

      svg { width: 18px; height: 18px; }

      &:hover {
        color: var(--tk-on-surface);
        background: var(--tk-surface-variant);
      }
    }
  `],
})
export class ThemeSwitcher {
  readonly isDark = signal(false);

  constructor() {
    // Check system preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tekad-theme');
      if (stored === 'dark') {
        this.isDark.set(true);
      } else if (stored === 'light') {
        this.isDark.set(false);
      } else {
        this.isDark.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    }

    effect(() => {
      document.documentElement.setAttribute('data-theme', this.isDark() ? 'dark' : 'light');
      localStorage.setItem('tekad-theme', this.isDark() ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this.isDark.set(!this.isDark());
  }
}
