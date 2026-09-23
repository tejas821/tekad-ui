import { Component } from '@angular/core';

@Component({
  selector: 'app-accessibility',
  standalone: true,
  template: `
    <div class="a11y-page">
      <div class="page-header">
        <h1>Accessibility</h1>
        <p class="page-header__desc">
          TEKAD verifies accessibility behaviourally in a real browser — not by counting attributes.
          Every component is tested for keyboard navigation, focus management, ARIA correctness,
          and forced-colors rendering.
        </p>
      </div>

      <section class="doc-section">
        <h2>Our Approach</h2>
        <div class="approach-grid">
          <div class="approach-card">
            <div class="approach-card__icon">🔬</div>
            <h3>Behavioural, Not Declarative</h3>
            <p>
              We don't test that <code>aria-label</code> exists — we test that focus never leaves
              a modal dialog across 12 Tab presses. The DOM presents what assistive technology
              is specified to act on.
            </p>
          </div>
          <div class="approach-card">
            <div class="approach-card__icon">🌐</div>
            <h3>Real Browser Gates</h3>
            <p>
              Four browser gates run in Chromium as part of CI. jsdom has no layout, no top layer,
              no <code>inert</code>, no animations, and no <code>matchMedia</code>.
            </p>
          </div>
          <div class="approach-card">
            <div class="approach-card__icon">🧬</div>
            <h3>Mutation Tested</h3>
            <p>
              28 plausible defects, each paired with the specific test that must catch it.
              Removing a mutant because it "makes the suite red" is never accepted — fix the test.
            </p>
          </div>
          <div class="approach-card">
            <div class="approach-card__icon">🎨</div>
            <h3>Forced Colours Ready</h3>
            <p>
              Every component has a <code>&#64;media (forced-colors: active)</code> block.
              We use <code>outline</code> over <code>box-shadow</code> for focus rings
              because box-shadow is dropped in high-contrast mode.
            </p>
          </div>
        </div>
      </section>

      <section class="doc-section">
        <h2>Native Elements</h2>
        <p>
          TEKAD decorates native HTML elements rather than replacing them with <code>div[role]</code>.
          This is not a philosophical choice — it's a technical one.
        </p>
        <div class="benefit-list">
          <div class="benefit">
            <h4>Forced Colours Work by Default</h4>
            <p>
              The UA maps system colours by element semantics. A real <code>&lt;button&gt;</code>
              is mapped to ButtonFace/ButtonText with no help.
            </p>
          </div>
          <div class="benefit">
            <h4>Every Native Behaviour is Already Correct</h4>
            <p>
              Enter/Space activation, form submission, <code>disabled</code> removing from tab order,
              <code>formaction</code>, <code>popovertarget</code>. None is reimplemented,
              so none can be reimplemented wrongly.
            </p>
          </div>
          <div class="benefit">
            <h4>No Extra DOM Elements</h4>
            <p>
              A wrapper on a 200-button page is 200 elements. SSR transfer size matters,
              and elements are the expensive part.
            </p>
          </div>
        </div>
      </section>

      <section class="doc-section">
        <h2>Focus Management</h2>
        <div class="focus-table">
          <table>
            <thead><tr><th>Component</th><th>Focus Behaviour</th><th>Tested By</th></tr></thead>
            <tbody>
              <tr><td>Button</td><td><code>:focus-visible</code> outline ring. Mouse clicks leave no ring.</td><td>Browser gate</td></tr>
              <tr><td>Input</td><td>Native focus. Field label is a click target via <code>&lt;label for&gt;</code>.</td><td>Browser gate</td></tr>
              <tr><td>Checkbox</td><td>Native input focus. Label wraps the input so clicking text toggles the box.</td><td>Browser gate</td></tr>
              <tr><td>Dialog</td><td><code>showModal()</code> traps focus. Tab across 12 presses never reaches outside elements. Escape closes with no key handler. Focus returns to trigger.</td><td>Browser gate</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="doc-section">
        <h2>ARIA Patterns</h2>
        <div class="aria-patterns">
          <div class="aria-pattern__item">
            <h4>Form Field — IDREF Wiring</h4>
            <p>
              <code>aria-describedby</code> lists errors first, then hints — in the order a user
              hearing the error needs: the reason before the advice.
              An empty list is <code>null</code>, never <code>""</code>.
            </p>
          </div>
          <div class="aria-pattern__item">
            <h4>Dialog — aria-labelledby</h4>
            <p>
              The heading input renders as <code>&lt;h2&gt;</code> and <code>aria-labelledby</code>
              points at it. The visible heading IS the accessible name — WCAG 2.2 SC 2.5.3.
            </p>
          </div>
          <div class="aria-pattern__item">
            <h4>Input — aria-invalid</h4>
            <p>
              Set to <code>"true"</code> when invalid, absent otherwise. Never <code>"false"</code> —
              that's explicit "not invalid" which adds noise to the accessibility tree.
            </p>
          </div>
          <div class="aria-pattern__item">
            <h4>Live Announcer</h4>
            <p>
              <code>@tekad/core/a11y/live-announcer</code> — a polite live region for
              announcing state changes to screen readers.
            </p>
          </div>
        </div>
      </section>

      <section class="doc-section">
        <h2>What Has NOT Been Verified</h2>
        <div class="honesty-callout">
          <p>
            <strong>No screen reader has been run, at any point.</strong> What is proved is that
            the DOM presents what assistive technology is specified to act on — real <code>&lt;input&gt;</code>
            elements, real <code>&lt;button&gt;</code> elements, labels by containment, IDREFs that resolve.
            That is not the same claim as "tested with NVDA".
          </p>
        </div>
        <ul class="unverified-list">
          <li>Firefox/Gecko and real Safari — every browser number here is Chromium</li>
          <li>Parse cost — measured, and run-to-run noise exceeds every difference</li>
          <li>The <code>position: fixed</code> overlay fallback path</li>
        </ul>
      </section>

      <section class="doc-section">
        <h2>WCAG Compliance Targets</h2>
        <div class="wcag-grid">
          <div class="wcag-item">
            <span class="wcag-level">AA</span>
            <span class="wcag-sc">1.4.3</span>
            <span>Contrast (Minimum) — 4.5:1 for body text</span>
          </div>
          <div class="wcag-item">
            <span class="wcag-level">AA</span>
            <span class="wcag-sc">1.4.11</span>
            <span>Non-text Contrast — 3:1 for UI components</span>
          </div>
          <div class="wcag-item">
            <span class="wcag-level">AAA</span>
            <span class="wcag-sc">2.5.8</span>
            <span>Target Size — 44px minimum hit targets</span>
          </div>
          <div class="wcag-item">
            <span class="wcag-level">AA</span>
            <span class="wcag-sc">2.4.7</span>
            <span>Focus Visible — outline-based focus rings</span>
          </div>
          <div class="wcag-item">
            <span class="wcag-level">AA</span>
            <span class="wcag-sc">2.5.3</span>
            <span>Label in Name — visible text matches accessible name</span>
          </div>
          <div class="wcag-item">
            <span class="wcag-level">AA</span>
            <span class="wcag-sc">1.4.1</span>
            <span>Use of Color — errors never rely on color alone</span>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid var(--tk-outline-variant);
      h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.75rem; background: linear-gradient(135deg, var(--tk-primary), var(--tk-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    }
    .page-header__desc { font-size: 1.125rem; color: var(--tk-on-surface-variant); line-height: 1.7; max-width: 640px; }
    .doc-section { margin-bottom: 3rem; h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; } p { color: var(--tk-on-surface-variant); line-height: 1.7; margin-bottom: 1rem; } }
    .approach-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .approach-card { padding: 1.5rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg); background: var(--tk-surface);
      h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
      p { font-size: 0.875rem; color: var(--tk-on-surface-variant); line-height: 1.6; margin: 0; }
    }
    .approach-card__icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .benefit-list { display: flex; flex-direction: column; gap: 1rem; }
    .benefit { padding: 1rem 1.25rem; border-left: 3px solid var(--tk-primary); background: var(--tk-surface-variant); border-radius: 0 var(--tk-radius-md) var(--tk-radius-md) 0;
      h4 { font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.25rem; }
      p { font-size: 0.8125rem; color: var(--tk-on-surface-variant); margin: 0; line-height: 1.5; }
    }
    .focus-table, .aria-patterns { }
    .focus-table table { width: 100%; border-collapse: collapse; font-size: 0.875rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg); overflow: hidden;
      th { text-align: left; padding: 0.75rem 1rem; background: var(--tk-surface-variant); font-weight: 600; font-size: 0.8125rem; border-bottom: 1px solid var(--tk-outline-variant); }
      td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--tk-outline-variant); color: var(--tk-on-surface-variant); }
      tr:last-child td { border-bottom: none; }
    }
    .aria-patterns { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .aria-pattern__item { padding: 1.25rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-lg);
      h4 { font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.375rem; }
      p { font-size: 0.8125rem; color: var(--tk-on-surface-variant); margin: 0; line-height: 1.5; }
    }
    .honesty-callout { padding: 1.25rem; background: #fff7ed; border: 1px solid #fed7aa; border-radius: var(--tk-radius-lg);
      p { color: #9a3412; margin: 0; font-size: 0.875rem; line-height: 1.6; }
    }
    [data-theme="dark"] .honesty-callout { background: rgba(251, 146, 60, 0.1); border-color: rgba(251, 146, 60, 0.3);
      p { color: #fdba74; }
    }
    .unverified-list { list-style: disc; padding-left: 1.5rem; color: var(--tk-on-surface-variant);
      li { margin-bottom: 0.375rem; font-size: 0.875rem; }
    }
    .wcag-grid { display: flex; flex-direction: column; gap: 0.5rem; }
    .wcag-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.75rem; border: 1px solid var(--tk-outline-variant); border-radius: var(--tk-radius-md); font-size: 0.875rem; }
    .wcag-level { padding: 0.125rem 0.5rem; background: var(--tk-primary); color: var(--tk-on-primary); border-radius: var(--tk-radius-sm); font-size: 0.6875rem; font-weight: 700; min-width: 32px; text-align: center; }
    .wcag-sc { font-family: var(--tk-font-mono); font-size: 0.75rem; font-weight: 600; color: var(--tk-primary); min-width: 50px; }
    @media (max-width: 768px) {
      .approach-grid, .aria-patterns { grid-template-columns: 1fr; }
    }
  `],
})
export class AccessibilityComponent {}
