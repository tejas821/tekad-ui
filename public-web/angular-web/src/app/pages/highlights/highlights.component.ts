import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeViewer } from '../../shared/code-viewer/code-viewer.component';

@Component({
  selector: 'app-highlights',
  standalone: true,
  imports: [RouterLink, CodeViewer],
  template: `
    <div class="highlights">
      <div class="page-header">
        <div class="page-header__badge">Why TEKAD</div>
        <h1>Highlights</h1>
        <p class="page-header__desc">
          What makes TEKAD different. Every claim here is backed by measurement, 
          not assumption. Every behaviour is verified in a real browser.
        </p>
      </div>

      <!-- Hero Stats -->
      <section class="stats-bar">
        <div class="stats-bar__item">
          <span class="stats-bar__value">19</span>
          <span class="stats-bar__label">Packages</span>
        </div>
        <div class="stats-bar__item">
          <span class="stats-bar__value">102</span>
          <span class="stats-bar__label">Unit Tests</span>
        </div>
        <div class="stats-bar__item">
          <span class="stats-bar__value">28</span>
          <span class="stats-bar__label">Mutants Caught</span>
        </div>
        <div class="stats-bar__item">
          <span class="stats-bar__value">22</span>
          <span class="stats-bar__label">CI Gates</span>
        </div>
        <div class="stats-bar__item">
          <span class="stats-bar__value">4</span>
          <span class="stats-bar__label">Browser Gates</span>
        </div>
      </section>

      <!-- Highlight 1: Native Elements -->
      <section class="highlight">
        <div class="highlight__number">01</div>
        <div class="highlight__content">
          <h2>Decorate, Don't Replace</h2>
          <p class="highlight__lead">
            TEKAD components are attribute selectors on native HTML elements. 
            <code>button[tkButton]</code> is still a <code>&lt;button&gt;</code>. 
            <code>input[tkInput]</code> is still an <code>&lt;input&gt;</code>.
          </p>
          <div class="highlight__reasons">
            <div class="reason">
              <h4>🎨 Forced Colours Work by Default</h4>
              <p>The UA maps system colours by element semantics. A real <code>&lt;button&gt;</code> gets ButtonFace/ButtonText 
              mapping with zero effort. A <code>&lt;div role="button"&gt;</code> gets nothing.</p>
            </div>
            <div class="reason">
              <h4>⌨️ Every Native Behaviour is Already Correct</h4>
              <p>Enter/Space activation, form submission, <code>disabled</code> removing from tab order, 
              <code>formaction</code>, <code>popovertarget</code> — none reimplemented, none broken.</p>
            </div>
            <div class="reason">
              <h4>📦 No Extra DOM Elements</h4>
              <p>A wrapper on a 200-button page is 200 elements. SSR measured: the component instance 
              is the expensive part, not the encapsulation attribute.</p>
            </div>
          </div>
          <app-code-viewer [code]="nativeCode" language="html" label="HTML" />
        </div>
      </section>

      <!-- Highlight 2: Mutation Testing -->
      <section class="highlight">
        <div class="highlight__number">02</div>
        <div class="highlight__content">
          <h2>Mutation-Tested Behaviour</h2>
          <p class="highlight__lead">
            28 plausible defects, each paired with the <em>specific test</em> that must catch it. 
            A green suite that silently tolerates a bug is caught before CI.
          </p>
          <div class="highlight__evidence">
            <div class="evidence-card">
              <div class="evidence-card__icon">🧬</div>
              <h4>The Live Announcer Bug</h4>
              <p>The test suite went green on first run. Then we deleted the single line that makes 
              repeated announcements audible — <strong>9 of 11 tests still passed</strong>. 
              That mutant now guards the line permanently.</p>
            </div>
            <div class="evidence-card">
              <div class="evidence-card__icon">🔍</div>
              <h4>The Vacuous Gate</h4>
              <p>A module-boundary rule meant to ban charting libraries <strong>could not fire</strong> — 
              it takes its external branch only when the package is installed, and a banned package never is. 
              Three of the first five gates were vacuous. Self-tests found them.</p>
            </div>
            <div class="evidence-card">
              <div class="evidence-card__icon">🛡️</div>
              <h4>Named Test, Not Just Red</h4>
              <p>"The run went red" is not evidence — a mutant that fails to compile fails everything. 
              <code>tools/verify-mutation.mjs</code> requires <em>that named test</em> to fail. 
              A renamed test leaves the run red for a reason nobody chose.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Highlight 3: CSS Layers -->
      <section class="highlight">
        <div class="highlight__number">03</div>
        <div class="highlight__content">
          <h2>CSS Layers — Your Rules Always Win</h2>
          <p class="highlight__lead">
            All TEKAD styles live in <code>&#64;layer tekad.components</code>. Your unlayered CSS 
            always wins, regardless of specificity. No <code>!important</code>. No <code>::ng-deep</code>.
          </p>
          <app-code-viewer [code]="layerCode" language="css" label="CSS" />
          <div class="highlight__callout">
            <p>
              <strong>Measured, not assumed.</strong> The layer declaration had been load-bearing since Phase 4 
              with nothing checking it. A dedicated browser gate now proves an unlayered consumer rule 
              overrides TEKAD's stylesheet — at any specificity.
            </p>
          </div>
        </div>
      </section>

      <!-- Highlight 4: Accessibility is Behavioural -->
      <section class="highlight">
        <div class="highlight__number">04</div>
        <div class="highlight__content">
          <h2>Accessibility Verified Behaviourally</h2>
          <p class="highlight__lead">
            Not attribute-counting. Real browser gates test focus management, keyboard navigation, 
            ARIA IDREF resolution, and forced-colours rendering in actual Chromium.
          </p>
          <div class="a11y-table">
            <table>
              <thead>
                <tr><th>What's Tested</th><th>How</th><th>Where</th></tr>
              </thead>
              <tbody>
                <tr><td>Focus trap in dialogs</td><td>Tab across 12 presses, assert focus never leaves</td><td>Browser gate</td></tr>
                <tr><td>Escape closes dialog</td><td>Press Escape, assert dialog is gone</td><td>Browser gate</td></tr>
                <tr><td>Focus restoration</td><td>Close dialog, assert focus returns to trigger</td><td>Browser gate</td></tr>
                <tr><td>Button hit target</td><td>Assert min-block-size ≥ 44px at density 1</td><td>Browser gate</td></tr>
                <tr><td>Forced-colours mapping</td><td>Real <code>&lt;button&gt;</code> gets ButtonFace, not nothing</td><td>Architectural decision</td></tr>
                <tr><td>aria-describedby resolves</td><td>IDREF points at an element that exists in DOM</td><td>Unit test</td></tr>
                <tr><td>outline focus ring</td><td>Not box-shadow (dropped in forced-colours)</td><td>CSS review</td></tr>
              </tbody>
            </table>
          </div>
          <div class="highlight__honesty">
            <p>
              <strong>Honesty note:</strong> No screen reader has been run at any point. 
              What's proved is that the DOM presents what assistive technology is <em>specified</em> to act on. 
              That is not the same claim as "tested with NVDA."
            </p>
          </div>
        </div>
      </section>

      <!-- Highlight 5: Three-Tier Tokens -->
      <section class="highlight">
        <div class="highlight__number">05</div>
        <div class="highlight__content">
          <h2>Three-Tier Design Tokens</h2>
          <p class="highlight__lead">
            Primitive → Semantic → Component. Primitives are resolved at build time and never shipped. 
            Semantic tokens (<code>--tekad-sys-*</code>) are the public API. Component tokens 
            (<code>--tekad-button-*</code>) are the customization surface.
          </p>
          <div class="token-flow">
            <div class="token-tier">
              <div class="token-tier__label">Primitive</div>
              <div class="token-tier__example">oklch(0.45 0.2 260)</div>
              <div class="token-tier__note">Build-time only. Never shipped.</div>
            </div>
            <div class="token-tier__arrow">→</div>
            <div class="token-tier">
              <div class="token-tier__label">Semantic</div>
              <div class="token-tier__example">--tekad-sys-color-primary</div>
              <div class="token-tier__note">The public API. Light/dark aware.</div>
            </div>
            <div class="token-tier__arrow">→</div>
            <div class="token-tier">
              <div class="token-tier__label">Component</div>
              <div class="token-tier__example">--tekad-button-background</div>
              <div class="token-tier__note">Per-instance override surface.</div>
            </div>
          </div>
          <app-code-viewer [code]="tokenCode" language="html" label="HTML" />
        </div>
      </section>

      <!-- Highlight 6: showModal() -->
      <section class="highlight">
        <div class="highlight__number">06</div>
        <div class="highlight__content">
          <h2>Several Hundred Lines Not Written</h2>
          <p class="highlight__lead">
            <code>&lt;dialog&gt;.showModal()</code> provides focus trapping, Escape handling, 
            background inertness, <code>aria-modal</code>, and focus restoration — all in the engine.
          </p>
          <div class="highlight__measured">
            <div class="measured-item">
              <span class="measured-item__check">✓</span>
              <span>Tab across 12 presses never reaches elements outside the dialog</span>
            </div>
            <div class="measured-item">
              <span class="measured-item__check">✓</span>
              <span>Shift+Tab across 6 presses does not either</span>
            </div>
            <div class="measured-item">
              <span class="measured-item__check">✓</span>
              <span>Escape closes with no key handler written by TEKAD</span>
            </div>
            <div class="measured-item">
              <span class="measured-item__check">✓</span>
              <span>Focus returns to the trigger unaided</span>
            </div>
          </div>
          <p class="highlight__note">
            A hand-written focus trap must know about <code>inert</code>, shadow roots, 
            <code>tabindex="-1"</code>, radio groups, <code>contenteditable</code>, iframes — 
            and will be wrong in some of them. The platform's implementation is already correct.
          </p>
        </div>
      </section>

      <!-- Highlight 7: Two Bugs That Would Have Shipped -->
      <section class="highlight">
        <div class="highlight__number">07</div>
        <div class="highlight__content">
          <h2>Bugs the Unit Suite Missed</h2>
          <p class="highlight__lead">
            Two bugs that would have shipped. Both invisible to a green unit suite. 
            Both caught by a browser gate on its first run.
          </p>
          <div class="bug-cards">
            <div class="bug-card">
              <div class="bug-card__header">
                <span class="bug-card__tag">Bug #1</span>
                <span class="bug-card__impact">Would have shipped</span>
              </div>
              <h4>The 21-Pixel Button</h4>
              <p>
                <code>.tk-button {{ '{' }} ... {{ '}' }}</code> was rewritten by Angular to 
                <code>.tk-button[_ngcontent-…]</code> — an attribute on elements <em>inside</em> the template. 
                The host carries <code>_nghost-…</code>. Not one rule matched. 
                The button was 21px tall in the UA's default grey.
              </p>
              <p class="bug-card__fix">
                <strong>Fix:</strong> Every rule became <code>:host</code>.
              </p>
            </div>
            <div class="bug-card">
              <div class="bug-card__header">
                <span class="bug-card__tag">Bug #2</span>
                <span class="bug-card__impact">Would have shipped</span>
              </div>
              <h4>The Non-Red Error Text</h4>
              <p>
                Projected content carries the scoping attribute of the component that <em>declared</em> it, 
                not the one it's projected into. The form field's error text was not red and nothing said so.
              </p>
              <p class="bug-card__fix">
                <strong>Fix:</strong> Each projected element owns its own stylesheet with <code>:host</code> rules.
              </p>
            </div>
          </div>
          <div class="highlight__rule">
            <p>
              <strong>The rule:</strong> A component styles its own host and its own template, and nothing else.
            </p>
          </div>
        </div>
      </section>

      <!-- Highlight 8: Emulated Encapsulation Cost -->
      <section class="highlight">
        <div class="highlight__number">08</div>
        <div class="highlight__content">
          <h2>Measured, Not Theorised</h2>
          <p class="highlight__lead">
            Every architectural decision in TEKAD was measured before being committed. 
            Several overturned assumptions.
          </p>
          <div class="measurements">
            <div class="measurement">
              <div class="measurement__header">
                <h4>Emulated Encapsulation Transfer Cost</h4>
                <span class="measurement__verdict">+4.8% <em>smaller</em> with gzip</span>
              </div>
              <p>On a 1,000×8 table, the <code>_ngcontent</code> attribute adds +87.7% raw — 
              but after gzip, the document is 4.8% <em>smaller</em> than the unencapsulated one. 
              The same 27 bytes 9,005 times is the easiest input a compressor will ever see.</p>
            </div>
            <div class="measurement">
              <div class="measurement__header">
                <h4>OKLCH Lightness ≠ WCAG Luminance</h4>
                <span class="measurement__verdict">4.054:1 to 4.550:1 spread</span>
              </div>
              <p>Five hues at identical OKLCH lightness and chroma span 4.054:1 to 4.550:1 on white — 
              the AA threshold falls <em>inside</em> the spread. Tones are generated in OKLCH 
              and then checked in sRGB.</p>
            </div>
            <div class="measurement">
              <div class="measurement__header">
                <h4>Angular Does NOT Forbid Both Forms Contracts</h4>
                <span class="measurement__verdict">Compiles, boots, silently fails</span>
              </div>
              <p>A class implementing both <code>ControlValueAccessor</code> and <code>FormValueControl</code> 
              compiles, boots, renders, and silently never binds its signal model. That is worse than a 
              prohibition. The decision to keep them apart survived and became load-bearing.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="cta-section">
        <div class="cta-card">
          <h2>Convinced?</h2>
          <p>Start building with TEKAD UI today.</p>
          <div class="cta-card__actions">
            <a routerLink="/getting-started" class="cta-btn cta-btn--primary">Get Started</a>
            <a routerLink="/components" class="cta-btn cta-btn--secondary">Browse Components</a>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid var(--tk-outline-variant);
      h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.75rem;
        background: linear-gradient(135deg, var(--tk-primary), var(--tk-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    }
    .page-header__badge { display: inline-block; padding: 0.25rem 0.75rem; background: rgba(43,92,238,0.08); color: var(--tk-primary); border-radius: 100px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
    .page-header__desc { font-size: 1.125rem; color: var(--tk-on-surface-variant); line-height: 1.7; max-width: 640px; }

    .stats-bar { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 3rem; padding: 1.25rem; background: var(--tk-surface-variant); border-radius: 16px; }
    .stats-bar__item { flex: 1; min-width: 100px; text-align: center; }
    .stats-bar__value { display: block; font-size: 1.75rem; font-weight: 800; background: linear-gradient(135deg, var(--tk-primary), var(--tk-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .stats-bar__label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tk-on-surface-variant); }

    .highlight { display: flex; gap: 2rem; margin-bottom: 4rem; padding-bottom: 4rem; border-bottom: 1px solid var(--tk-outline-variant); }
    .highlight__number { font-size: 4rem; font-weight: 900; line-height: 1; color: var(--tk-outline-variant); flex-shrink: 0; min-width: 80px; }
    .highlight__content { flex: 1; min-width: 0; }
    .highlight__content h2 { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
    .highlight__lead { font-size: 1.0625rem; color: var(--tk-on-surface-variant); line-height: 1.7; margin-bottom: 1.5rem; }
    .highlight__lead code { font-size: 0.875em; }

    .highlight__reasons { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
    .reason { padding: 1rem 1.25rem; border-left: 3px solid var(--tk-primary); background: var(--tk-surface-variant); border-radius: 0 8px 8px 0;
      h4 { font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.25rem; }
      p { font-size: 0.8125rem; color: var(--tk-on-surface-variant); margin: 0; line-height: 1.5; }
    }

    .highlight__evidence { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1.5rem; }
    .evidence-card { padding: 1.25rem; border: 1px solid var(--tk-outline-variant); border-radius: 12px; background: var(--tk-surface);
      h4 { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
      p { font-size: 0.875rem; color: var(--tk-on-surface-variant); line-height: 1.6; margin: 0; }
    }
    .evidence-card__icon { font-size: 1.25rem; margin-bottom: 0.5rem; }

    .highlight__callout { padding: 1rem 1.25rem; background: rgba(43,92,238,0.05); border: 1px solid rgba(43,92,238,0.15); border-radius: 12px; margin-top: 1rem;
      p { font-size: 0.875rem; color: var(--tk-on-surface-variant); margin: 0; line-height: 1.6; }
    }

    .highlight__honesty { padding: 1rem 1.25rem; background: rgba(249,115,22,0.05); border: 1px solid rgba(249,115,22,0.15); border-radius: 12px; margin-top: 1rem;
      p { font-size: 0.875rem; color: var(--tk-on-surface-variant); margin: 0; line-height: 1.6; }
    }

    .a11y-table { overflow-x: auto; border: 1px solid var(--tk-outline-variant); border-radius: 12px; margin-bottom: 1rem;
      table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
      th { text-align: left; padding: 0.75rem 1rem; background: var(--tk-surface-variant); font-weight: 600; border-bottom: 1px solid var(--tk-outline-variant); }
      td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--tk-outline-variant); color: var(--tk-on-surface-variant); }
      tr:last-child td { border-bottom: none; }
    }

    .token-flow { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .token-tier { flex: 1; min-width: 140px; padding: 1rem; background: var(--tk-surface-variant); border-radius: 12px; text-align: center; }
    .token-tier__label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tk-primary); margin-bottom: 0.375rem; }
    .token-tier__example { font-family: var(--tk-font-mono); font-size: 0.75rem; color: var(--tk-on-surface); margin-bottom: 0.25rem; word-break: break-all; }
    .token-tier__note { font-size: 0.6875rem; color: var(--tk-on-surface-variant); }
    .token-tier__arrow { font-size: 1.5rem; color: var(--tk-outline); flex-shrink: 0; }

    .highlight__measured { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .measured-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.625rem 1rem; background: var(--tk-surface-variant); border-radius: 8px; font-size: 0.875rem; }
    .measured-item__check { color: var(--tk-success); font-weight: 700; flex-shrink: 0; }

    .highlight__note { font-size: 0.875rem; color: var(--tk-on-surface-variant); line-height: 1.6; }
    .highlight__rule { padding: 1rem 1.25rem; background: var(--tk-primary-container); border-radius: 12px; margin-top: 1rem;
      p { font-size: 0.9375rem; margin: 0; color: var(--tk-on-primary-container); }
    }

    .bug-cards { display: grid; gap: 1rem; margin-bottom: 1rem; }
    .bug-card { padding: 1.25rem; border: 1px solid var(--tk-outline-variant); border-radius: 12px; border-left: 3px solid var(--tk-danger);
      h4 { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
      p { font-size: 0.8125rem; color: var(--tk-on-surface-variant); line-height: 1.6; margin-bottom: 0.5rem; }
    }
    .bug-card__header { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
    .bug-card__tag { font-size: 0.6875rem; font-weight: 600; padding: 0.125rem 0.5rem; background: var(--tk-danger); color: white; border-radius: 4px; }
    .bug-card__impact { font-size: 0.6875rem; font-weight: 500; padding: 0.125rem 0.5rem; background: rgba(220,38,38,0.1); color: var(--tk-danger); border-radius: 4px; }
    .bug-card__fix { font-size: 0.8125rem; color: var(--tk-success); margin: 0; }

    .measurements { display: flex; flex-direction: column; gap: 1rem; }
    .measurement { padding: 1.25rem; border: 1px solid var(--tk-outline-variant); border-radius: 12px;
      h4 { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
      p { font-size: 0.8125rem; color: var(--tk-on-surface-variant); line-height: 1.6; margin: 0; }
    }
    .measurement__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem; }
    .measurement__verdict { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.625rem; background: rgba(5,150,105,0.1); color: var(--tk-success); border-radius: 100px; white-space: nowrap; flex-shrink: 0; }

    .cta-section { padding: 3rem 0; }
    .cta-card { text-align: center; padding: 3rem 2rem; background: linear-gradient(135deg, rgba(43,92,238,0.05), rgba(124,58,237,0.05)); border: 1px solid var(--tk-outline-variant); border-radius: 20px;
      h2 { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; }
      p { font-size: 1.0625rem; color: var(--tk-on-surface-variant); margin-bottom: 1.5rem; }
    }
    .cta-card__actions { display: flex; gap: 0.75rem; justify-content: center; }
    .cta-btn { display: inline-flex; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.9375rem; font-weight: 600; text-decoration: none; transition: all 0.2s; }
    .cta-btn--primary { background: var(--tk-primary); color: var(--tk-on-primary); }
    .cta-btn--primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(43,92,238,0.3); text-decoration: none; }
    .cta-btn--secondary { background: var(--tk-surface-variant); color: var(--tk-on-surface); border: 1px solid var(--tk-outline); }
    .cta-btn--secondary:hover { transform: translateY(-2px); text-decoration: none; }

    app-code-viewer { margin-bottom: 1rem; }

    @media (max-width: 768px) {
      .highlight { flex-direction: column; gap: 1rem; }
      .highlight__number { font-size: 2.5rem; }
      .token-flow { flex-direction: column; }
      .token-tier__arrow { transform: rotate(90deg); }
      .stats-bar { flex-direction: column; }
    }
  `],
})
export class HighlightsComponent {
  nativeCode = `<!-- TEKAD: decorate the native element -->
<button tkButton appearance="filled">Save</button>
<input tkInput [(value)]="name" />

<!-- Not this: -->
<!-- <tk-button>Save</tk-button>  ← extra element, no forced colours -->
<!-- <tk-input />                 ← wrapper div, reimplemented behaviour -->`;

  layerCode = `/* TEKAD declares its layer */
@layer tekad.reset, tekad.base, tekad.components, tekad.utilities;

/* Your unlayered CSS always wins — at any specificity */
.my-app .tk-button {
  background: hotpink;  /* Wins. No !important. No ::ng-deep. */
}

/* Even this wins: */
button { color: red; }  /* Beats TEKAD's :host(.tk-button--filled) */`;

  tokenCode = `<!-- Destructive button — no tone input needed. -->
<!-- Override component tokens to reach colours TEKAD never chose. -->
<button tkButton
  style="--tekad-button-background: var(--tekad-sys-color-danger);
         --tekad-button-foreground: var(--tekad-sys-color-on-danger)">
  Delete
</button>`;
}
