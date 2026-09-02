import { describe, it, expect, beforeEach } from 'vitest';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TEKAD_FIELD_CONTEXT } from '@tekad/core/forms/field-context';
import { TekadFormField } from './tekad-form-field';
import { TekadFieldHint } from './tekad-field-hint';
import { TekadFieldError } from './tekad-field-error';

/**
 * The field's whole job is ARIA IDREF wiring, and every way of getting it wrong
 * is silent: the page renders, looks right, and a screen-reader user gets an
 * unlabelled box.
 *
 * So these tests do not check that attributes exist. They check that each
 * reference RESOLVES — that `getElementById` of what `aria-describedby` names
 * actually finds the element, and that its text is what the user would be told.
 * An attribute containing a plausible-looking id nothing points at is exactly
 * the failure being guarded against, and it passes an existence check.
 *
 * ── Why the control here is a stub ────────────────────────────────────────
 *
 * `@tekad/form-field` must accept a control it has never heard of — that is
 * ADR-006 tier 2, and it is why the field offers a token instead of querying
 * for a component type. A suite that used `@tekad/input` would prove the two
 * TEKAD components agree with each other, which is a weaker claim. The
 * integration with the real input is in `packages/input`.
 */
@Component({
  selector: 'input[stubControl]',
  standalone: true,
  template: '',
  host: {
    '[attr.id]': 'id',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
    '[attr.aria-invalid]': 'field?.invalid() ? "true" : null',
  },
})
class StubControl {
  protected readonly field = inject(TEKAD_FIELD_CONTEXT, { optional: true });
  readonly id = 'stub-control-1';
  constructor() {
    this.field?.setControlId(this.id);
  }
}

@Component({
  standalone: true,
  imports: [TekadFormField, TekadFieldHint, TekadFieldError, StubControl],
  template: `
    <tk-form-field data-probe="full" label="Email">
      <input stubControl />
      <tk-field-hint>We will not share it.</tk-field-hint>
      @if (showError()) {
        <tk-field-error>Enter a valid address.</tk-field-error>
      }
    </tk-form-field>

    <tk-form-field data-probe="bare" label="Bare">
      <input stubControl />
    </tk-form-field>

    <tk-form-field data-probe="nolabel">
      <input stubControl />
    </tk-form-field>
  `,
})
class Host {
  readonly showError = signal(false);
}

describe('TekadFormField', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;

  const field = (p: string) => el.querySelector(`[data-probe="${p}"]`) as HTMLElement;
  const control = (p: string) => field(p).querySelector('input') as HTMLInputElement;
  const label = (p: string) => field(p).querySelector('label') as HTMLLabelElement | null;

  /** Resolve an IDREF list the way assistive technology does. */
  const resolve = (ids: string | null) =>
    (ids ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => el.querySelector(`#${CSS.escape(id)}`));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  describe('the label', () => {
    it('points at the control the consumer actually rendered', () => {
      // Not "the for attribute is set" — that it RESOLVES. A label naming an
      // id nothing has is indistinguishable from a correct one by inspection.
      const forId = label('full')?.getAttribute('for');
      expect(forId).toBe(control('full').id);
      expect(el.querySelector(`#${CSS.escape(forId ?? '')}`)).toBe(control('full'));
    });

    it('is a real label element, so the visible text IS the accessible name', () => {
      // WCAG 2.2 SC 2.5.3 Label in Name: an aria-label would silently replace
      // the visible text and break speech control for someone saying the words
      // they can see.
      expect(label('full')?.tagName).toBe('LABEL');
      expect(label('full')?.textContent?.trim()).toBe('Email');
      expect(control('full').hasAttribute('aria-label')).toBe(false);
    });

    it('renders no label element at all when there is no label text', () => {
      // An empty <label for="x"> is worse than none: it claims to name the
      // control and names it nothing.
      expect(label('nolabel')).toBeNull();
    });
  });

  describe('aria-describedby', () => {
    it('resolves to the hint, with the text the user would hear', () => {
      const targets = resolve(control('bare').getAttribute('aria-describedby'));
      expect(targets).toHaveLength(0);

      const full = resolve(control('full').getAttribute('aria-describedby'));
      expect(full).toHaveLength(1);
      expect(full[0]?.textContent?.trim()).toBe('We will not share it.');
    });

    it('is ABSENT rather than empty when there is nothing to describe', () => {
      // aria-describedby="" is a reference to a missing element, not an
      // absence, and some assistive technology reports it as an error.
      expect(control('bare').hasAttribute('aria-describedby')).toBe(false);
    });

    it('adds the error when it appears, and resolves both', () => {
      fixture.componentInstance.showError.set(true);
      fixture.detectChanges();

      const targets = resolve(control('full').getAttribute('aria-describedby'));
      expect(targets).toHaveLength(2);
      expect(targets.every((t) => t !== null)).toBe(true);
    });

    /**
     * Order is not cosmetic here: assistive technology reads the list in the
     * order given, and a user who has just been told their input is wrong needs
     * the REASON before the advice. The DOM order is the other way round,
     * because visually the hint sits under the control.
     */
    it('announces the error BEFORE the hint, which is not the DOM order', () => {
      fixture.componentInstance.showError.set(true);
      fixture.detectChanges();

      const targets = resolve(control('full').getAttribute('aria-describedby'));
      expect(targets[0]?.textContent?.trim()).toBe('Enter a valid address.');
      expect(targets[1]?.textContent?.trim()).toBe('We will not share it.');

      // And the DOM really does have them the other way round, or the
      // assertion above is accidental.
      const inDom = Array.from(field('full').querySelectorAll('tk-field-hint, tk-field-error'));
      expect(inDom[0]?.tagName.toLowerCase()).toBe('tk-field-error');
    });

    it('drops the error again when it goes away', () => {
      fixture.componentInstance.showError.set(true);
      fixture.detectChanges();
      fixture.componentInstance.showError.set(false);
      fixture.detectChanges();

      const targets = resolve(control('full').getAttribute('aria-describedby'));
      expect(targets).toHaveLength(1);
      // A dangling reference to a removed element is the classic leak here.
      expect(targets[0]?.isConnected).toBe(true);
    });
  });

  describe('invalid', () => {
    it('is not set before there is an error', () => {
      expect(control('full').hasAttribute('aria-invalid')).toBe(false);
    });

    it('marks the control when an error is present', () => {
      fixture.componentInstance.showError.set(true);
      fixture.detectChanges();
      expect(control('full').getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('the error element', () => {
    it('is a live region, so it is announced and not merely displayed', () => {
      fixture.componentInstance.showError.set(true);
      fixture.detectChanges();
      const err = field('full').querySelector('tk-field-error');
      // role="alert" is aria-live="assertive" plus aria-atomic. Assertive is
      // the exception in TEKAD, and this is the case that earns it: the user
      // must know before they act again.
      expect(err?.getAttribute('role')).toBe('alert');
    });
  });

  describe('a control that does not participate', () => {
    it('is still rendered', () => {
      // The field never queries for a component type, so a control that does
      // not inject the token is simply not wired. Rendering it anyway is the
      // honest outcome; refusing to would make the field unusable with a
      // consumer's own control.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [Unwired] });
      const f = TestBed.createComponent(Unwired);
      f.detectChanges();
      const plain = (f.nativeElement as HTMLElement).querySelector('input');
      expect(plain).toBeTruthy();
      expect(plain?.hasAttribute('aria-describedby')).toBe(false);
    });
  });
});

@Component({
  standalone: true,
  imports: [TekadFormField, TekadFieldHint],
  template: `
    <tk-form-field label="Plain">
      <input />
      <tk-field-hint>Unwired</tk-field-hint>
    </tk-form-field>
  `,
})
class Unwired {}
