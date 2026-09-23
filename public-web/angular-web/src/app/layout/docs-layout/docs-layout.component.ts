import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header.component';
import { Sidebar } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-docs-layout',
  standalone: true,
  imports: [RouterOutlet, Header, Sidebar],
  template: `
    <app-header />
    <div class="docs">
      <app-sidebar />
      <main class="docs__content">
        <article class="docs__article">
          <router-outlet />
        </article>
      </main>
    </div>
  `,
  styles: [`
    .docs {
      display: flex;
      min-height: calc(100vh - var(--tk-header-height));
    }

    .docs__content {
      flex: 1;
      min-width: 0;
      padding: 2.5rem 3rem 4rem;
      max-width: 100%;
    }

    .docs__article {
      max-width: var(--tk-content-max-width);
      animation: fadeIn 0.3s ease-out;
    }

    @media (max-width: 1024px) {
      .docs__content {
        padding: 2rem 1.5rem 3rem;
      }
    }

    @media (max-width: 640px) {
      .docs__content {
        padding: 1.5rem 1rem 2rem;
      }
    }
  `],
})
export class DocsLayoutComponent {}
