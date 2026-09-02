/**
 * TEKAD slice probe — the Phase 9 components, in a real browser.
 *
 * One app for the whole slice rather than one per component. The gates that
 * read it are separate (`verify-button-styling.mjs` and its siblings), because
 * a failure should name the component it is about; but ten probe apps would be
 * ten builds and ten `index.html` files differing in nothing that matters.
 *
 * What is measured here is everything jsdom cannot host: computed style,
 * layout, focus, cascade layers, and forced colours. The unit suites in each
 * package cover the logic. See `docs/architecture/14-testing-infrastructure.md`
 * for the division and the measurement behind it.
 *
 * Nothing here is a demo. Each element exists because a gate asserts something
 * about it, and an element nothing asserts about should be deleted.
 */
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { TekadButton } from '@tekad/button';

declare global {
  interface Window {
    TEKAD_SLICE_READY?: boolean;
  }
}

@Component({
  selector: 'tk-slice-probe',
  standalone: true,
  imports: [TekadButton],
  template: `
    <main>
      <section id="buttons">
        <button tkButton data-probe="filled">Filled</button>
        <button tkButton appearance="outlined" data-probe="outlined">Outlined</button>
        <button tkButton appearance="text" data-probe="text">Text</button>
        <button tkButton disabled data-probe="disabled">Disabled</button>

        <!--
          ADR-007 decision 1's whole promise. TEKAD's rule is .tk-button inside
          @layer tekad.components; the consumer's is .consumer-override,
          unlayered, in the page. Same specificity, but the layered rule must
          lose regardless — that is what removes the need for !important and
          ::ng-deep. (No backticks in this comment: it lives inside a template
          literal, and one would end it.)
        -->
        <button tkButton class="consumer-override" data-probe="overridden">Overridden</button>
      </section>
    </main>
  `,
  styles: `
    main {
      padding: 1rem;
      background: var(--tekad-sys-color-surface);
      color: var(--tekad-sys-color-on-surface);
    }
    section {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }
  `,
})
export class SliceProbe {}

void bootstrapApplication(SliceProbe).then(() => {
  window.TEKAD_SLICE_READY = true;
});
