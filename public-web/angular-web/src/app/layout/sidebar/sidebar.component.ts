import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  path: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="collapsed()">
      <nav class="sidebar__nav" aria-label="Documentation">
        @for (section of sections; track section.title) {
          <div class="sidebar__section">
            <h3 class="sidebar__section-title">{{ section.title }}</h3>
            <ul class="sidebar__list">
              @for (item of section.items; track item.path) {
                <li>
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="sidebar__link--active"
                    [routerLinkActiveOptions]="{ exact: item.path === '/components' }"
                    class="sidebar__link"
                  >
                    <span>{{ item.label }}</span>
                    @if (item.badge) {
                      <span class="sidebar__badge">{{ item.badge }}</span>
                    }
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      position: sticky;
      top: var(--tk-header-height);
      width: var(--tk-sidebar-width);
      height: calc(100vh - var(--tk-header-height));
      overflow-y: auto;
      padding: 1.5rem 1rem 1.5rem 0;
      flex-shrink: 0;
      border-right: 1px solid var(--tk-outline-variant);
    }

    .sidebar__nav {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .sidebar__section-title {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--tk-on-surface-variant);
      padding: 0 0.75rem;
      margin-bottom: 0.375rem;
    }

    .sidebar__list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .sidebar__link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.4375rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 450;
      color: var(--tk-on-surface-variant);
      text-decoration: none;
      border-radius: var(--tk-radius-md);
      transition: all 0.12s ease;

      &:hover {
        color: var(--tk-on-surface);
        background: var(--tk-surface-variant);
        text-decoration: none;
      }

      &--active {
        color: var(--tk-primary);
        background: var(--tk-primary-container);
        font-weight: 600;
      }
    }

    .sidebar__badge {
      display: inline-block;
      padding: 0.1rem 0.4rem;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: var(--tk-radius-sm);
      background: var(--tk-success);
      color: white;
      letter-spacing: 0.03em;
    }

    @media (max-width: 1024px) {
      .sidebar {
        display: none;
      }
    }
  `],
})
export class Sidebar {
  readonly collapsed = signal(false);

  readonly sections: NavSection[] = [
    {
      title: 'Foundation',
      items: [
        { label: 'Getting Started', path: '/getting-started' },
        { label: 'Highlights', path: '/highlights' },
        { label: 'Theming', path: '/theming' },
        { label: 'Design Tokens', path: '/design-tokens' },
        { label: 'Accessibility', path: '/accessibility' },
      ],
    },
    {
      title: 'Components',
      items: [
        { label: 'Overview', path: '/components' },
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
      ],
    },
  ];
}
