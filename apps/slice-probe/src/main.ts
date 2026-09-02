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
import { Component, effect, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { TekadButton } from '@tekad/button';
import { TekadCheckbox } from '@tekad/checkbox';
import { TekadInput } from '@tekad/input';
import { TekadFieldError, TekadFieldHint, TekadFormField } from '@tekad/form-field';
import { TekadDialog } from '@tekad/dialog';

declare global {
  interface Window {
    TEKAD_SLICE_READY?: boolean;
  }
}

@Component({
  selector: 'tk-slice-probe',
  standalone: true,
  imports: [
    TekadButton,
    TekadCheckbox,
    TekadInput,
    TekadFormField,
    TekadFieldHint,
    TekadFieldError,
    TekadDialog,
  ],
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

      <section id="checkboxes">
        <tk-checkbox data-probe="cb-unchecked">Unchecked</tk-checkbox>
        <tk-checkbox data-probe="cb-checked" [checked]="true">Checked</tk-checkbox>
        <tk-checkbox data-probe="cb-mixed" [indeterminate]="true">Mixed</tk-checkbox>
        <tk-checkbox data-probe="cb-disabled" [disabled]="true">Disabled</tk-checkbox>
      </section>

      <section id="fields">
        <tk-form-field data-probe="field-ok" label="Email">
          <input tkInput data-probe="input-ok" />
          <tk-field-hint>We will not share it.</tk-field-hint>
        </tk-form-field>

        <tk-form-field data-probe="field-bad" label="Postcode">
          <input tkInput data-probe="input-bad" />
          <tk-field-error>Enter a valid postcode.</tk-field-error>
        </tk-form-field>

        <input tkInput data-probe="input-bare" />
      </section>

      <section id="dialog">
        <button tkButton data-probe="dialog-trigger" (click)="dialogOpen.set(true)">
          Open dialog
        </button>

        <!--
          Three focusable elements inside, so a Tab cycle is long enough that a
          trap which only handles one wrap-around would be caught.
        -->
        <tk-dialog [(open)]="dialogOpen" heading="Delete this?">
          <p>This cannot be undone.</p>
          <input tkInput data-probe="dialog-input" />
          <button tkButton appearance="outlined" data-probe="dialog-secondary">Keep</button>
          <button tkButton data-probe="dialog-close" (click)="dialogOpen.set(false)">Delete</button>
        </tk-dialog>
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
    /* The fields need real width for the input's block-size to be meaningful. */
    #fields > * {
      inline-size: 18rem;
    }
  `,
})
export class SliceProbe {
  readonly dialogOpen = signal(false);

  constructor() {
    // Mirrored onto the body so the gate can read the CONSUMER'S state, not
    // the element's. The distinction is the point of the two-way model: the
    // platform can close a dialog (Escape, a form method="dialog") and a
    // consumer whose model was not told still believes it is open.
    effect(() => {
      document.body.setAttribute('data-dialog-open', String(this.dialogOpen()));
    });
  }
}

void bootstrapApplication(SliceProbe).then(() => {
  window.TEKAD_SLICE_READY = true;
});
