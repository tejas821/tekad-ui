import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadFormField, TekadFieldError, TekadFieldHint } from '@tekad/form-field';
import { TekadInput } from './tekad-input';

/**
 * `TekadInput` decorates a native `<input>`, so — as with the button — much of
 * this asserts that the platform still works rather than that TEKAD
 * reimplemented it.
 *
 * The second half is the integration `packages/form-field` deliberately cannot
 * test: that a real TEKAD input inside a real TEKAD field is actually wired.
 * The field's own suite uses a stub control, because the field must work with a
 * control it has never heard of and a suite pairing the two TEKAD components
 * would only prove they agree with each other.
 */
@Component({
  standalone: true,
  imports: [TekadInput, TekadFormField, TekadFieldHint, TekadFieldError],
  template: `
    <input tkInput data-probe="bare" [(value)]="bare" />
    <input tkInput data-probe="explicit" id="chosen-id" />
    <input tkInput data-probe="disabled" [disabled]="true" />
    <input tkInput data-probe="readonly" [readonly]="true" />
    <input tkInput data-probe="required" [required]="true" />
    <input tkInput data-probe="invalid" [invalid]="true" />
    <input tkInput data-probe="touch" (touch)="touches = touches + 1" />

    <tk-form-field data-probe="field" label="Email">
      <input tkInput [(value)]="email" />
      <tk-field-hint>We will not share it.</tk-field-hint>
      @if (bad()) {
        <tk-field-error>Enter a valid address.</tk-field-error>
      }
    </tk-form-field>
  `,
})
class Host {
  readonly bare = signal('');
  readonly email = signal('');
  readonly bad = signal(false);
  touches = 0;
}

describe('TekadInput', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;

  const at = (p: string) => el.querySelector(`[data-probe="${p}"]`) as HTMLElement;
  const input = (p: string) => {
    const e = at(p);
    return (e.tagName === 'INPUT' ? e : e.querySelector('input')) as HTMLInputElement;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  describe('the native element', () => {
    it('stays a real input, not a wrapper', () => {
      // Its type, autofill, spellcheck, IME behaviour and forced-colors
      // mapping all depend on this and nothing else.
      expect(input('bare').tagName).toBe('INPUT');
      expect(input('bare').hasAttribute('role')).toBe(false);
    });

    it('reflects the model into the element', () => {
      fixture.componentInstance.bare.set('hello');
      fixture.detectChanges();
      expect(input('bare').value).toBe('hello');
    });

    it('takes the new value FROM the element on input', () => {
      const i = input('bare');
      i.value = 'typed';
      i.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      // Read, not derived. The platform has already decided the value — after
      // IME composition, after autofill, after a paste — and computing it
      // again is how a control disagrees with the box the user is looking at.
      expect(fixture.componentInstance.bare()).toBe('typed');
    });

    it('forwards disabled, readonly and required to the platform', () => {
      expect(input('disabled').disabled).toBe(true);
      expect(input('readonly').readOnly).toBe(true);
      expect(input('required').required).toBe(true);
    });
  });

  describe('identity', () => {
    it('lets an explicit id win', () => {
      expect(input('explicit').id).toBe('chosen-id');
    });

    it('generates a distinct one otherwise', () => {
      expect(input('bare').id).toMatch(/^tk-input-\d+$/);
      expect(input('bare').id).not.toBe(input('disabled').id);
    });
  });

  describe('aria-invalid', () => {
    it('is "true" when invalid', () => {
      expect(input('invalid').getAttribute('aria-invalid')).toBe('true');
    });

    it('is ABSENT rather than "false" when valid', () => {
      // aria-invalid="false" is legal and means "explicitly not invalid", but
      // every control in a form emitting it is noise in the accessibility tree
      // for no gain.
      expect(input('bare').hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('touch', () => {
    it('emits on blur, and not before', () => {
      expect(fixture.componentInstance.touches).toBe(0);
      input('touch').dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();
      expect(fixture.componentInstance.touches).toBe(1);
    });
  });

  describe('inside a form field', () => {
    const resolve = (ids: string | null) =>
      (ids ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => el.querySelector(`#${CSS.escape(id)}`));

    it("announces its id, so the field's label resolves to it", () => {
      const forId = at('field').querySelector('label')?.getAttribute('for');
      expect(forId).toBe(input('field').id);
      expect(el.querySelector(`#${CSS.escape(forId ?? '')}`)).toBe(input('field'));
    });

    it('binds a describedby that resolves to the hint', () => {
      const targets = resolve(input('field').getAttribute('aria-describedby'));
      expect(targets).toHaveLength(1);
      expect(targets[0]?.textContent?.trim()).toBe('We will not share it.');
    });

    it('picks up the error when it appears, and goes invalid with it', () => {
      fixture.componentInstance.bad.set(true);
      fixture.detectChanges();

      const targets = resolve(input('field').getAttribute('aria-describedby'));
      expect(targets).toHaveLength(2);
      expect(targets[0]?.textContent?.trim()).toBe('Enter a valid address.');
      expect(input('field').getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('outside a form field', () => {
    it('is a working input, not a broken one', () => {
      // The field context is injected `{ optional: true }` precisely so this
      // holds. An input that needed a wrapper to function would make the
      // wrapper mandatory in fact while being optional in the type.
      const i = input('bare');
      i.value = 'standalone';
      i.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(fixture.componentInstance.bare()).toBe('standalone');
      expect(i.hasAttribute('aria-describedby')).toBe(false);
    });
  });
});
