import { Component, input } from '@angular/core';

@Component({
  selector: 'app-component-header',
  standalone: true,
  template: `
    <div class="component-header">
      <div class="component-header__badge">
        <span class="component-header__package">{{ package() }}</span>
      </div>
      <h1 class="component-header__title">{{ title() }}</h1>
      <p class="component-header__description">{{ description() }}</p>
      @if (selector()) {
        <div class="component-header__selector">
          <code>{{ selector() }}</code>
        </div>
      }
      <div class="component-header__tags">
        @for (tag of tags(); track tag) {
          <span class="component-header__tag">{{ tag }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .component-header {
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--tk-outline-variant);
    }
    .component-header__badge {
      margin-bottom: 0.75rem;
    }
    .component-header__package {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      background: var(--tk-primary-container);
      color: var(--tk-on-primary-container);
      border-radius: var(--tk-radius-sm);
      font-family: var(--tk-font-mono);
      font-size: 0.8125rem;
      font-weight: 500;
    }
    .component-header__title {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.75rem;
      background: linear-gradient(135deg, var(--tk-primary) 0%, var(--tk-secondary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .component-header__description {
      font-size: 1.125rem;
      color: var(--tk-on-surface-variant);
      max-width: 640px;
      line-height: 1.7;
      margin-bottom: 1rem;
    }
    .component-header__selector {
      margin-bottom: 0.75rem;
    }
    .component-header__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .component-header__tag {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      background: var(--tk-surface-variant);
      color: var(--tk-on-surface-variant);
      border-radius: var(--tk-radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
    }
  `],
})
export class ComponentHeader {
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly package = input<string>('@tekad/');
  readonly selector = input<string>('');
  readonly tags = input<string[]>([]);
}
