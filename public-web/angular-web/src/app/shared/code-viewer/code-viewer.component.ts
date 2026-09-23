import { Component, input, signal, computed } from '@angular/core';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import scss from 'highlight.js/lib/languages/scss';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('css', scss);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);

@Component({
  selector: 'app-code-viewer',
  standalone: true,
  template: `
    <div class="code-viewer">
      @if (label()) {
        <div class="code-viewer__header">
          <span class="code-viewer__lang">{{ label() }}</span>
          <button
            class="code-viewer__copy"
            (click)="copyCode()"
            [attr.aria-label]="'Copy ' + label() + ' code'"
          >
            @if (copied()) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Copied!</span>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            }
          </button>
        </div>
      }
      <div class="code-viewer__body">
        <pre><code [innerHTML]="highlighted()"></code></pre>
      </div>
    </div>
  `,
  styles: [`
    .code-viewer {
      border-radius: var(--tk-radius-lg);
      overflow: hidden;
      border: 1px solid var(--tk-outline-variant);
      background: var(--tk-code-bg);
    }
    .code-viewer__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .code-viewer__lang {
      font-family: var(--tk-font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--tk-code-comment);
    }
    .code-viewer__copy {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.5rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--tk-radius-sm);
      color: var(--tk-code-comment);
      font-family: var(--tk-font-sans);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;

      svg {
        width: 14px;
        height: 14px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--tk-code-text);
      }
    }
    .code-viewer__body {
      padding: 1rem 1.25rem;
      overflow-x: auto;

      pre {
        margin: 0;
      }

      code {
        font-family: var(--tk-font-mono);
        font-size: 0.8125rem;
        line-height: 1.75;
        color: var(--tk-code-text);
      }
    }

    /* highlight.js theme - Catppuccin Mocha inspired */
    ::ng-deep {
      .hljs-keyword, .hljs-selector-tag, .hljs-deletion {
        color: #cba6f7;
      }
      .hljs-string, .hljs-addition, .hljs-selector-attr, .hljs-selector-pseudo {
        color: #a6e3a1;
      }
      .hljs-number, .hljs-literal {
        color: #fab387;
      }
      .hljs-type, .hljs-class .hljs-title, .hljs-title.class_, .hljs-title.function_ {
        color: #89b4fa;
      }
      .hljs-tag {
        color: #f38ba8;
      }
      .hljs-name {
        color: #f38ba8;
      }
      .hljs-attr, .hljs-attribute {
        color: #f9e2af;
      }
      .hljs-comment {
        color: #6c7086;
        font-style: italic;
      }
      .hljs-built_in {
        color: #f38ba8;
      }
      .hljs-meta {
        color: #f9e2af;
      }
      .hljs-variable, .hljs-template-variable {
        color: #f5c2e7;
      }
      .hljs-property {
        color: #89dceb;
      }
      .hljs-params {
        color: #cdd6f4;
      }
      .hljs-selector-class, .hljs-selector-id {
        color: #89b4fa;
      }
      .hljs-punctuation {
        color: #9399b2;
      }
    }
  `],
})
export class CodeViewer {
  readonly code = input<string>('');
  readonly language = input<string>('typescript');
  readonly label = input<string>('');

  readonly copied = signal(false);

  readonly highlighted = computed(() => {
    const code = this.code().trim();
    if (!code) return '';
    try {
      const lang = this.language();
      if (hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return this.escapeHtml(code);
    }
  });

  copyCode(): void {
    navigator.clipboard.writeText(this.code().trim()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
