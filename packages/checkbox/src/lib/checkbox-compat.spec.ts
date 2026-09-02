import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TekadCompatAdapter } from '@tekad/forms/compat';
import { TekadCheckbox } from './tekad-checkbox';

/**
 * ADR-013's decision, end to end.
 *
 * A real TEKAD control implementing exactly ONE forms contract
 * (`FormCheckboxControl`), driven by Reactive Forms through a directive that
 * lives in a different package — and, in the same page, a sibling of the same
 * component driven by signal forms.
 *
 * ── Why this file lives here and not with the adapter ─────────────────────
 *
 * `@tekad/forms` is `layer:foundation` and may not depend on a component;
 * `@tekad/checkbox` is `layer:component` and may depend on foundation. So the
 * integration test belongs on this side of the boundary, and the adapter's own
 * suite tests it against a stub that spells out the token's whole contract.
 * The boundary rule caught this — the first version of the adapter's spec
 * imported the checkbox.
 *
 * ── What it is really asserting ───────────────────────────────────────────
 *
 * That the separation ADR-013 requires is workable, not merely enforced. The
 * ADR's stated reason turned out to be false — Angular does not forbid one
 * class doing both, it silently prefers the CVA and never binds the signal
 * model — which made the separation more important and left open the question
 * of whether a control kept deliberately ignorant of Reactive Forms can still
 * be driven by them. This is the answer.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, TekadCheckbox, TekadCompatAdapter],
  template: `
    <tk-checkbox data-probe="cva" tkCompat [formControl]="terms">I accept</tk-checkbox>
    <tk-checkbox data-probe="signal" [(checked)]="plain">Plain</tk-checkbox>
  `,
})
class Host {
  readonly terms = new FormControl(false);
  readonly plain = signal(false);
}

describe('TekadCheckbox with @tekad/forms/compat', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;

  const input = (probe: string) =>
    el.querySelector(`[data-probe="${probe}"] input`) as HTMLInputElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('shows the form value in the native input', () => {
    fixture.componentInstance.terms.setValue(true);
    fixture.detectChanges();
    expect(input('cva').checked).toBe(true);
  });

  it('reports a real click to the FormControl', () => {
    input('cva').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.terms.value).toBe(true);
    expect(fixture.componentInstance.terms.dirty).toBe(true);
  });

  it('disables the control when the form disables it', () => {
    fixture.componentInstance.terms.disable();
    fixture.detectChanges();
    // All the way through: setDisabledState -> disabledByForm ->
    // effectivelyDisabled -> the native input's disabled property, which is
    // what actually stops the user.
    expect(input('cva').disabled).toBe(true);
  });

  it('re-enables it again', () => {
    fixture.componentInstance.terms.disable();
    fixture.detectChanges();
    fixture.componentInstance.terms.enable();
    fixture.detectChanges();
    expect(input('cva').disabled).toBe(false);
  });

  it('marks the form touched when the control is blurred', () => {
    input('cva').dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    expect(fixture.componentInstance.terms.touched).toBe(true);
  });

  it('does not go dirty when the FORM set the value', () => {
    fixture.componentInstance.terms.setValue(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.terms.dirty).toBe(false);
  });

  describe('the sibling using signal forms', () => {
    it('is untouched by the form-driven one', () => {
      fixture.componentInstance.terms.setValue(true);
      fixture.detectChanges();
      // The adapter injects its control with { self: true }. Without that it
      // could resolve up the tree and drive a control the consumer never
      // pointed at, which presents as "the wrong field updates".
      expect(input('signal').checked).toBe(false);
      expect(fixture.componentInstance.plain()).toBe(false);
    });

    it('still works, on the same page, at the same time', () => {
      fixture.componentInstance.plain.set(true);
      fixture.detectChanges();
      expect(input('signal').checked).toBe(true);
      expect(fixture.componentInstance.terms.value).toBe(false);
    });
  });
});
