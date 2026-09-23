import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Header } from '../../layout/header/header.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, Header],
  template: `
    <app-header />

    <!-- Hero Section with Animated Background -->
    <section class="hero">
      <div class="hero__mesh">
        <div class="hero__orb hero__orb--1"></div>
        <div class="hero__orb hero__orb--2"></div>
        <div class="hero__orb hero__orb--3"></div>
        <div class="hero__orb hero__orb--4"></div>
      </div>

      <div class="hero__grid"></div>

      <div class="hero__content container">
        <div class="hero__badge">
          <span class="hero__badge-dot"></span>
          <span>Angular 22 · Signals · Standalone · 19 Packages</span>
        </div>
        
        <h1 class="hero__title">
          Build interfaces<br/>
          <span class="hero__title-gradient">everyone</span> can use.
        </h1>
        
        <p class="hero__subtitle">
          Production-grade Angular components with accessibility baked in, 
          not bolted on. Verified in real browsers, tested with mutants.
        </p>

        <div class="hero__actions">
          <a routerLink="/getting-started" class="hero__btn hero__btn--primary">
            <span>Get Started</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <a routerLink="/components" class="hero__btn hero__btn--glass">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <span>Browse Components</span>
          </a>
        </div>

        <!-- Stats with animated counters -->
        <div class="hero__stats">
          <div class="stat-card">
            <div class="stat-card__value">{{ animatedPackages() }}</div>
            <div class="stat-card__label">Packages</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">{{ animatedTests() }}</div>
            <div class="stat-card__label">Unit Tests</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">{{ animatedMutants() }}</div>
            <div class="stat-card__label">Mutants Caught</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">{{ animatedGates() }}</div>
            <div class="stat-card__label">CI Gates</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Live Component Showcase -->
    <section class="showcase">
      <div class="container">
        <div class="section-header">
          <div class="section-header__badge">Live Demos</div>
          <h2 class="section-header__title">See it in action</h2>
          <p class="section-header__desc">
            Interactive previews of TEKAD components. No screenshots — real, working UI.
          </p>
        </div>

        <div class="showcase__grid">
          <!-- Button Demo -->
          <div class="demo-card">
            <div class="demo-card__header">
              <span class="demo-card__pkg">&#64;tekad/button</span>
              <span class="demo-card__title">Button</span>
            </div>
            <div class="demo-card__preview">
              <button class="demo-btn demo-btn--filled">Filled</button>
              <button class="demo-btn demo-btn--outlined">Outlined</button>
              <button class="demo-btn demo-btn--text">Text</button>
            </div>
            <a routerLink="/components/button" class="demo-card__link">
              View docs →
            </a>
          </div>

          <!-- Input Demo -->
          <div class="demo-card">
            <div class="demo-card__header">
              <span class="demo-card__pkg">&#64;tekad/input</span>
              <span class="demo-card__title">Input</span>
            </div>
            <div class="demo-card__preview demo-card__preview--col">
              <input class="demo-input" type="text" placeholder="Your name" />
              <input class="demo-input demo-input--error" type="email" placeholder="Email" value="invalid" />
            </div>
            <a routerLink="/components/input" class="demo-card__link">
              View docs →
            </a>
          </div>

          <!-- Checkbox Demo -->
          <div class="demo-card">
            <div class="demo-card__header">
              <span class="demo-card__pkg">&#64;tekad/checkbox</span>
              <span class="demo-card__title">Checkbox</span>
            </div>
            <div class="demo-card__preview demo-card__preview--col">
              <label class="demo-checkbox">
                <input type="checkbox" checked />
                <span class="demo-checkbox__box"></span>
                <span>Accept terms</span>
              </label>
              <label class="demo-checkbox">
                <input type="checkbox" />
                <span class="demo-checkbox__box"></span>
                <span>Subscribe to updates</span>
              </label>
            </div>
            <a routerLink="/components/checkbox" class="demo-card__link">
              View docs →
            </a>
          </div>

          <!-- Switch Demo -->
          <div class="demo-card">
            <div class="demo-card__header">
              <span class="demo-card__pkg">&#64;tekad/switch</span>
              <span class="demo-card__title">Switch</span>
            </div>
            <div class="demo-card__preview demo-card__preview--col">
              <label class="demo-switch">
                <input type="checkbox" checked />
                <span class="demo-switch__track"><span class="demo-switch__thumb"></span></span>
                <span>Dark mode</span>
              </label>
              <label class="demo-switch">
                <input type="checkbox" />
                <span class="demo-switch__track"><span class="demo-switch__thumb"></span></span>
                <span>Notifications</span>
              </label>
            </div>
            <a routerLink="/components/switch" class="demo-card__link">
              View docs →
            </a>
          </div>

          <!-- Badge Demo -->
          <div class="demo-card">
            <div class="demo-card__header">
              <span class="demo-card__pkg">&#64;tekad/badge</span>
              <span class="demo-card__title">Badge</span>
            </div>
            <div class="demo-card__preview">
              <span class="demo-badge demo-badge--primary">New</span>
              <span class="demo-badge demo-badge--success">Active</span>
              <span class="demo-badge demo-badge--danger">99+</span>
              <span class="demo-badge demo-badge--warning">Beta</span>
            </div>
            <a routerLink="/components/badge" class="demo-card__link">
              View docs →
            </a>
          </div>

          <!-- Progress Demo -->
          <div class="demo-card">
            <div class="demo-card__header">
              <span class="demo-card__pkg">&#64;tekad/progress</span>
              <span class="demo-card__title">Progress</span>
            </div>
            <div class="demo-card__preview demo-card__preview--col">
              <div class="demo-progress">
                <div class="demo-progress__fill" style="width: 65%"></div>
              </div>
              <div class="demo-progress demo-progress--indeterminate">
                <div class="demo-progress__fill"></div>
              </div>
            </div>
            <a routerLink="/components/progress" class="demo-card__link">
              View docs →
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <div class="section-header">
          <div class="section-header__badge">Why TEKAD?</div>
          <h2 class="section-header__title">Built different</h2>
          <p class="section-header__desc">
            Every decision measured, not assumed. Every behaviour verified in a real browser.
          </p>
        </div>

        <div class="features__grid">
          <div class="feature-card feature-card--glass">
            <div class="feature-card__icon feature-card__icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3>Accessibility First</h3>
            <p>
              Behavioural verification in real Chromium. Focus traps, ARIA IDREFs, 
              forced colours — tested at the browser gate, not by counting attributes.
            </p>
          </div>

          <div class="feature-card feature-card--glass">
            <div class="feature-card__icon feature-card__icon--purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <h3>Signals Canonical</h3>
            <p>
              Built on Angular 22 signal forms. <code>model()</code>, <code>input()</code>, 
              <code>output()</code> — no zone.js dependency in component logic.
            </p>
          </div>

          <div class="feature-card feature-card--glass">
            <div class="feature-card__icon feature-card__icon--cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <h3>Native Elements</h3>
            <p>
              <code>button[tkButton]</code>, <code>input[tkInput]</code> — decorate, don't replace. 
              Forced colours work by default, every native behaviour preserved.
            </p>
          </div>

          <div class="feature-card feature-card--glass">
            <div class="feature-card__icon feature-card__icon--pink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <h3>Mutation Tested</h3>
            <p>
              28 plausible defects, each paired with the test that must catch it. 
              Green suite that tolerates a bug? The mutant gate catches it before CI.
            </p>
          </div>

          <div class="feature-card feature-card--glass">
            <div class="feature-card__icon feature-card__icon--orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m7-13h-6m-6 0H1m16.5-4.5l-4.24 4.24M6.343 17.657l-4.24 4.24m12.73 0l-4.24-4.24M10.76 10.76L6.52 6.52"/>
              </svg>
            </div>
            <h3>Design Tokens</h3>
            <p>
              Three-tier architecture: primitive → semantic → component. 
              Light/dark via <code>light-dark()</code>, density as a single multiplier.
            </p>
          </div>

          <div class="feature-card feature-card--glass">
            <div class="feature-card__icon feature-card__icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707"/>
                <circle cx="12" cy="12" r="4"/>
              </svg>
            </div>
            <h3>CSS Layers</h3>
            <p>
              <code>&#64;layer tekad.components</code> — your unlayered CSS always wins. 
              No <code>!important</code>, no <code>::ng-deep</code>. Override anything.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Packages Section -->
    <section class="packages">
      <div class="container">
        <div class="section-header">
          <div class="section-header__badge">19 Packages</div>
          <h2 class="section-header__title">One ecosystem</h2>
        </div>

        <div class="packages__grid">
          @for (pkg of packages; track pkg.name) {
            <a [routerLink]="pkg.route" class="package-card">
              <div class="package-card__header">
                <code>{{ pkg.name }}</code>
                <span class="package-card__size">{{ pkg.size }}</span>
              </div>
              <p>{{ pkg.desc }}</p>
            </a>
          }
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <div class="container">
        <div class="cta__card">
          <div class="cta__glow"></div>
          <h2>Ready to build accessible interfaces?</h2>
          <p>
            Start with the getting started guide, or jump straight to component APIs.
          </p>
          <div class="cta__actions">
            <a routerLink="/getting-started" class="hero__btn hero__btn--primary">
              <span>Getting Started</span>
            </a>
            <a routerLink="/components" class="hero__btn hero__btn--glass">
              <span>Component API</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer__grid">
          <div class="footer__brand">
            <div class="footer__logo">
              <svg viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#grad)"/>
                <path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32">
                    <stop stop-color="#2b5cee"/>
                    <stop offset="1" stop-color="#7c3aed"/>
                  </linearGradient>
                </defs>
              </svg>
              <span>TEKAD UI</span>
            </div>
            <p>Production-grade Angular components.<br/>Phase 9 of 15 — actively developed.</p>
          </div>
          
          <div class="footer__col">
            <h4>Documentation</h4>
            <a routerLink="/getting-started">Getting Started</a>
            <a routerLink="/components">Components</a>
            <a routerLink="/theming">Theming</a>
            <a routerLink="/design-tokens">Design Tokens</a>
          </div>
          
          <div class="footer__col">
            <h4>Resources</h4>
            <a routerLink="/accessibility">Accessibility</a>
            <a href="https://github.com/tejas821/tekad-ui" target="_blank">GitHub</a>
            <a href="https://github.com/tejas821/tekad-ui/blob/main/ROADMAP.md" target="_blank">Roadmap</a>
          </div>
        </div>
        
        <div class="footer__bottom">
          <p>Built with care. Tested with mutants. Verified in a real browser.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    /* ===== HERO ===== */
    .hero {
      position: relative;
      min-height: 90vh;
      display: flex;
      align-items: center;
      overflow: hidden;
      padding: 4rem 0;
    }

    .hero__mesh {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .hero__orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.4;
      animation: float 20s ease-in-out infinite;
    }

    .hero__orb--1 {
      width: 600px; height: 600px;
      background: var(--tk-primary);
      top: -200px; right: -100px;
      animation-delay: 0s;
    }
    .hero__orb--2 {
      width: 500px; height: 500px;
      background: var(--tk-secondary);
      bottom: -150px; left: -100px;
      animation-delay: -5s;
    }
    .hero__orb--3 {
      width: 400px; height: 400px;
      background: var(--tk-accent);
      top: 40%; left: 30%;
      animation-delay: -10s;
    }
    .hero__orb--4 {
      width: 350px; height: 350px;
      background: #ec4899;
      top: 20%; right: 20%;
      animation-delay: -15s;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(30px, -30px) scale(1.05); }
      50% { transform: translate(-20px, 20px) scale(0.95); }
      75% { transform: translate(20px, 30px) scale(1.02); }
    }

    .hero__grid {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(43, 92, 238, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(43, 92, 238, 0.03) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent);
    }

    .hero__content {
      position: relative;
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
      padding: 0 1.5rem;
      z-index: 1;
    }

    .hero__badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(43, 92, 238, 0.08);
      border: 1px solid rgba(43, 92, 238, 0.2);
      border-radius: 100px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--tk-primary);
      margin-bottom: 2rem;
      backdrop-filter: blur(8px);
    }

    .hero__badge-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--tk-primary);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    .hero__title {
      font-size: clamp(2.5rem, 6vw, 4.5rem);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.04em;
      margin-bottom: 1.5rem;
    }

    .hero__title-gradient {
      background: linear-gradient(135deg, var(--tk-primary) 0%, var(--tk-secondary) 50%, var(--tk-accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero__subtitle {
      font-size: 1.25rem;
      line-height: 1.6;
      color: rgba(15, 17, 23, 0.7);
      max-width: 600px;
      margin: 0 auto 2.5rem;
    }

    .hero__actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 4rem;
    }

    .hero__btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1.75rem;
      border-radius: 12px;
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .hero__btn--primary {
      background: var(--tk-primary);
      color: var(--tk-on-primary);
      box-shadow: 0 4px 16px rgba(43, 92, 238, 0.3);
    }
    .hero__btn--primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(43, 92, 238, 0.4);
    }

    .hero__btn--glass {
      background: rgba(255, 255, 255, 0.8);
      color: var(--tk-on-surface);
      border: 1px solid var(--tk-outline);
      backdrop-filter: blur(8px);
    }
    .hero__btn--glass:hover {
      background: rgba(255, 255, 255, 1);
      transform: translateY(-2px);
    }

    .hero__stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .stat-card {
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.6);
      border: 1px solid var(--tk-outline-variant);
      border-radius: 16px;
      backdrop-filter: blur(12px);
    }

    .stat-card__value {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--tk-primary), var(--tk-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-card__label {
      font-size: 0.75rem;
      font-weight: 500;
      color: rgba(15, 17, 23, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ===== SECTIONS ===== */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }

    .section-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .section-header__badge {
      display: inline-block;
      padding: 0.375rem 0.875rem;
      background: rgba(43, 92, 238, 0.08);
      color: var(--tk-primary);
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }

    .section-header__title {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.75rem;
    }

    .section-header__desc {
      font-size: 1.125rem;
      color: rgba(15, 17, 23, 0.7);
      max-width: 600px;
      margin: 0 auto;
    }

    /* ===== SHOWCASE ===== */
    .showcase {
      padding: 5rem 0;
      background: var(--tk-surface-variant);
    }

    .showcase__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .demo-card {
      background: white;
      border: 1px solid var(--tk-outline-variant);
      border-radius: 16px;
      padding: 1.5rem;
      transition: all 0.2s ease;
    }
    .demo-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
      border-color: var(--tk-primary);
    }

    .demo-card__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .demo-card__pkg {
      font-size: 0.6875rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      background: rgba(43, 92, 238, 0.08);
      color: var(--tk-primary);
      border-radius: 6px;
    }

    .demo-card__title {
      font-size: 0.9375rem;
      font-weight: 600;
    }

    .demo-card__preview {
      min-height: 80px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--tk-surface-variant);
      border-radius: 12px;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .demo-card__preview--col {
      flex-direction: column;
      align-items: stretch;
    }

    .demo-card__link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--tk-primary);
      text-decoration: none;
    }
    .demo-card__link:hover {
      text-decoration: underline;
    }

    /* Demo components */
    .demo-btn {
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s;
    }
    .demo-btn--filled {
      background: var(--tk-primary);
      color: white;
    }
    .demo-btn--outlined {
      background: transparent;
      color: var(--tk-primary);
      border-color: var(--tk-outline);
    }
    .demo-btn--text {
      background: transparent;
      color: var(--tk-primary);
    }

    .demo-input {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--tk-outline);
      border-radius: 8px;
      font-size: 0.875rem;
      outline: none;
    }
    .demo-input:focus {
      border-color: var(--tk-primary);
      box-shadow: 0 0 0 3px rgba(43, 92, 238, 0.1);
    }
    .demo-input--error {
      border-color: #dc2626;
    }

    .demo-checkbox {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .demo-checkbox input { display: none; }
    .demo-checkbox__box {
      width: 20px; height: 20px;
      border: 2px solid var(--tk-outline);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .demo-checkbox input:checked + .demo-checkbox__box {
      background: var(--tk-primary);
      border-color: var(--tk-primary);
    }

    .demo-switch {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .demo-switch input { display: none; }
    .demo-switch__track {
      width: 44px; height: 24px;
      background: var(--tk-outline);
      border-radius: 12px;
      position: relative;
      transition: background 0.2s;
    }
    .demo-switch__thumb {
      position: absolute;
      top: 2px; left: 2px;
      width: 20px; height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .demo-switch input:checked + .demo-switch__track {
      background: var(--tk-primary);
    }
    .demo-switch input:checked + .demo-switch__track .demo-switch__thumb {
      transform: translateX(20px);
    }

    .demo-badge {
      padding: 0.25rem 0.625rem;
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .demo-badge--primary { background: var(--tk-primary); color: white; }
    .demo-badge--success { background: #059669; color: white; }
    .demo-badge--danger { background: #dc2626; color: white; }
    .demo-badge--warning { background: #d97706; color: white; }

    .demo-progress {
      width: 100%;
      height: 8px;
      background: var(--tk-outline-variant);
      border-radius: 4px;
      overflow: hidden;
    }
    .demo-progress__fill {
      height: 100%;
      background: var(--tk-primary);
      border-radius: 4px;
      transition: width 0.3s;
    }
    .demo-progress--indeterminate .demo-progress__fill {
      width: 40%;
      animation: indeterminate 1.5s ease-in-out infinite;
    }
    @keyframes indeterminate {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(250%); }
    }

    /* ===== FEATURES ===== */
    .features {
      padding: 5rem 0;
    }

    .features__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .feature-card {
      padding: 2rem;
      border-radius: 20px;
      transition: all 0.2s ease;
    }
    .feature-card--glass {
      background: rgba(255, 255, 255, 0.6);
      border: 1px solid var(--tk-outline-variant);
      backdrop-filter: blur(12px);
    }
    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    }

    .feature-card__icon {
      width: 48px; height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .feature-card__icon svg { width: 24px; height: 24px; }
    .feature-card__icon--blue { background: rgba(43, 92, 238, 0.1); color: var(--tk-primary); }
    .feature-card__icon--purple { background: rgba(124, 58, 237, 0.1); color: var(--tk-secondary); }
    .feature-card__icon--cyan { background: rgba(6, 182, 212, 0.1); color: var(--tk-accent); }
    .feature-card__icon--pink { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
    .feature-card__icon--orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }
    .feature-card__icon--green { background: rgba(16, 185, 129, 0.1); color: #10b981; }

    .feature-card h3 {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    .feature-card p {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: rgba(15, 17, 23, 0.7);
    }
    .feature-card code {
      font-size: 0.8125rem;
      padding: 0.125rem 0.375rem;
      background: rgba(43, 92, 238, 0.08);
      color: var(--tk-primary);
      border-radius: 4px;
    }

    /* ===== PACKAGES ===== */
    .packages {
      padding: 5rem 0;
      background: var(--tk-surface-variant);
    }

    .packages__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .package-card {
      padding: 1.25rem;
      background: white;
      border: 1px solid var(--tk-outline-variant);
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s;
    }
    .package-card:hover {
      border-color: var(--tk-primary);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    }

    .package-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .package-card__header code {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--tk-primary);
    }
    .package-card__size {
      font-size: 0.6875rem;
      padding: 0.125rem 0.5rem;
      background: var(--tk-surface-variant);
      border-radius: 100px;
      color: rgba(15, 17, 23, 0.6);
    }
    .package-card p {
      font-size: 0.8125rem;
      line-height: 1.5;
      color: rgba(15, 17, 23, 0.7);
    }

    /* ===== CTA ===== */
    .cta {
      padding: 5rem 0;
    }

    .cta__card {
      position: relative;
      padding: 4rem 2rem;
      text-align: center;
      background: linear-gradient(135deg, rgba(43, 92, 238, 0.05), rgba(124, 58, 237, 0.05));
      border: 1px solid var(--tk-outline-variant);
      border-radius: 24px;
      overflow: hidden;
    }

    .cta__glow {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(43, 92, 238, 0.2), transparent 70%);
      filter: blur(60px);
      pointer-events: none;
    }

    .cta__card h2 {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 1rem;
      position: relative;
    }
    .cta__card p {
      font-size: 1.125rem;
      color: rgba(15, 17, 23, 0.7);
      margin-bottom: 2rem;
      position: relative;
    }
    .cta__actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      position: relative;
    }

    /* ===== FOOTER ===== */
    .footer {
      padding: 3rem 0 1.5rem;
      border-top: 1px solid var(--tk-outline-variant);
    }

    .footer__grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 3rem;
      margin-bottom: 2rem;
    }

    .footer__logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .footer__logo svg { width: 32px; height: 32px; }
    .footer__logo span { font-size: 1.25rem; font-weight: 800; }

    .footer__brand p {
      font-size: 0.875rem;
      color: rgba(15, 17, 23, 0.7);
      line-height: 1.6;
    }

    .footer__col h4 {
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    .footer__col a {
      display: block;
      font-size: 0.875rem;
      color: rgba(15, 17, 23, 0.7);
      text-decoration: none;
      margin-bottom: 0.5rem;
    }
    .footer__col a:hover { color: var(--tk-primary); }

    .footer__bottom {
      padding-top: 1.5rem;
      border-top: 1px solid var(--tk-outline-variant);
      text-align: center;
    }
    .footer__bottom p {
      font-size: 0.8125rem;
      color: rgba(15, 17, 23, 0.6);
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .hero__stats { grid-template-columns: repeat(2, 1fr); }
      .showcase__grid { grid-template-columns: 1fr; }
      .features__grid { grid-template-columns: 1fr; }
      .footer__grid { grid-template-columns: 1fr; gap: 2rem; }
    }
  `],
})
export class HomeComponent implements OnInit {
  animatedPackages = signal(0);
  animatedTests = signal(0);
  animatedMutants = signal(0);
  animatedGates = signal(0);

  packages = [
    { name: '@tekad/core', desc: 'uniqueId, live announcer, forms tokens.', size: '~1 KB', route: '/getting-started' },
    { name: '@tekad/theme', desc: 'Design tokens with light/dark/density.', size: '1.01 KB', route: '/theming' },
    { name: '@tekad/overlay', desc: 'Deferred-close top-layer primitive.', size: '~2 KB', route: '/components/dialog' },
    { name: '@tekad/button', desc: 'Three appearances, 44px hit target.', size: '~0.8 KB', route: '/components/button' },
    { name: '@tekad/checkbox', desc: 'FormCheckboxControl with painted box.', size: '~1.2 KB', route: '/components/checkbox' },
    { name: '@tekad/input', desc: 'FormValueControl<string> on native input.', size: '~1 KB', route: '/components/input' },
    { name: '@tekad/form-field', desc: 'Label, hint, error with ARIA IDREF.', size: '~1.1 KB', route: '/components/form-field' },
    { name: '@tekad/dialog', desc: 'Native dialog + showModal().', size: '~1.5 KB', route: '/components/dialog' },
    { name: '@tekad/forms', desc: 'Reactive Forms adapter.', size: '~0.7 KB', route: '/getting-started' },
    { name: '@tekad/icon', desc: 'Inline SVG icon container.', size: '~0.3 KB', route: '/components/icon' },
    { name: '@tekad/switch', desc: 'Toggle with role="switch".', size: '~1 KB', route: '/components/switch' },
    { name: '@tekad/badge', desc: 'Count/status indicator.', size: '~0.4 KB', route: '/components/badge' },
    { name: '@tekad/card', desc: 'Content container with slots.', size: '~0.5 KB', route: '/components/card' },
    { name: '@tekad/divider', desc: 'Visual separator.', size: '~0.3 KB', route: '/components/divider' },
    { name: '@tekad/progress', desc: 'Progress bar.', size: '~0.6 KB', route: '/components/progress' },
    { name: '@tekad/tabs', desc: 'WAI-ARIA tabs pattern.', size: '~1.2 KB', route: '/components/tabs' },
    { name: '@tekad/tooltip', desc: 'Hover/focus label.', size: '~0.5 KB', route: '/components/tooltip' },
    { name: '@tekad/select', desc: 'Native select decoration.', size: '~1 KB', route: '/components/select' },
    { name: '@tekad/table', desc: 'Table foundation.', size: '~0.5 KB', route: '/components/table' },
  ];

  ngOnInit() {
    // Animate counters
    this.animateCounter(this.animatedPackages, 19, 1500);
    this.animateCounter(this.animatedTests, 102, 2000);
    this.animateCounter(this.animatedMutants, 28, 1800);
    this.animateCounter(this.animatedGates, 22, 1600);
  }

  private animateCounter(sig: ReturnType<typeof signal<number>>, target: number, duration: number) {
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.floor(progress * target);
      sig.set(value);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }
}
