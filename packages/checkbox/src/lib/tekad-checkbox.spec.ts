import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadCheckbox } from './tekad-checkbox';

/**
 * The checkbox wraps a native `<input type="checkbox">` rather than replacing
 * it, so — as with the button — much of what these tests assert is that the
 * platform still works, not that TEKAD reimplemented it.
 *
 * Styling is not here. The painted box, the forced-colors handover and the
 * focus ring need computed style in a real engine; they are in
 * `tools/verify-checkbox-behaviour.mjs`.
 */
@Component({
  standalone: true,
  imports: [TekadCheckbox],
  template: `
    <tk-checkbox data-probe="plain" [(checked)]="accepted">I accept</tk-checkbox>
    <tk-checkbox data-probe="indeterminate" [indeterminate]="mixed()">Some</tk-checkbox>
    <tk-checkbox data-probe="disabled" [disabled]="true">Disabled</tk-checkbox>
    <tk-checkbox data-probe="named" name="terms">Named</tk-checkbox>
    <tk-checkbox data-probe="unnamed">Unnamed</tk-checkbox>
    <tk-checkbox data-probe="touch" (touch)="touches = touches + 1">Touch</tk-checkbox>
  `,
})
class Host {
  readonly accepted = signal(false);
  readonly mixed = signal(true);
  touches = 0;
}

describe('TekadCheckbox', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  const input = (probe: string) =>
    el.querySelector(`[data-probe="${probe}"] input`) as HTMLInputElement;

  describe('the native input', () => {
    it('is a real checkbox input, not a div wearing a role', () => {
      // The forced-colors mapping, the mixed state and Space activation all
      // depend on this and nothing else.
      const i = input('plain');
      expect(i.tagName).toBe('INPUT');
      expect(i.type).toBe('checkbox');
      expect(i.hasAttribute('role')).toBe(false);
    });

    it('is inside the label, so the text is its accessible name by containment', () => {
      const label = el.querySelector('[data-probe="plain"] label');
      expect(label?.contains(input('plain'))).toBe(true);
      expect(label?.textContent?.trim()).toBe('I accept');
    });

    it('is not removed from the accessibility tree by the styling approach', () => {
      // display:none / visibility:hidden / [hidden] / width:0 each remove the
      // input from the tree, which is the most common way a custom checkbox
      // ends up announcing nothing. The stylesheet must use transparency.
      const i = input('plain');
      expect(i.hasAttribute('hidden')).toBe(false);
      expect(i.getAttribute('aria-hidden')).toBeNull();
    });
  });

  describe('checked', () => {
    it('reflects the model into the input', () => {
      expect(input('plain').checked).toBe(false);
      fixture.componentInstance.accepted.set(true);
      fixture.detectChanges();
      expect(input('plain').checked).toBe(true);
    });

    it('writes a user toggle back into the model', () => {
      const i = input('plain');
      i.checked = true;
      i.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(fixture.componentInstance.accepted()).toBe(true);
    });

    /**
     * READS the element rather than deriving the new state.
     *
     * The distinction is invisible in the happy path — one change event from
     * false lands on true either way — so it needs a change event that does
     * NOT flip the element. A control that toggles instead of reading goes to
     * `true` here and is then permanently out of step with the box the user is
     * looking at, with nothing to say so.
     *
     * The mutation gate found this: the test above passed with the toggle
     * mutant applied.
     */
    it('takes the new state FROM the element, not from flipping the model', () => {
      const i = input('plain');
      i.checked = false; // unchanged
      i.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(fixture.componentInstance.accepted()).toBe(false);
    });

    it('follows a real click, not just a synthetic change event', () => {
      // A click exercises the label/input wiring and the platform's own
      // toggle; a dispatched change event does not.
      input('plain').click();
      fixture.detectChanges();
      expect(fixture.componentInstance.accepted()).toBe(true);
      expect(input('plain').checked).toBe(true);
    });
  });

  describe('indeterminate', () => {
    /**
     * The one that would ship broken.
     *
     * `indeterminate` is a DOM PROPERTY with no HTML attribute. A template
     * binding writes an attribute the platform ignores entirely — the checkbox
     * renders as plain unchecked, and any test reading the attribute agrees
     * with itself while the user sees the wrong thing.
     */
    it('sets the DOM property, which has no HTML attribute', () => {
      expect(input('indeterminate').indeterminate).toBe(true);
    });

    it('clears when the input goes false', () => {
      fixture.componentInstance.mixed.set(false);
      fixture.detectChanges();
      expect(input('indeterminate').indeterminate).toBe(false);
    });

    it('leaves checked alone — mixed is a third state, not a weaker yes', () => {
      expect(input('indeterminate').checked).toBe(false);
    });
  });

  describe('disabled', () => {
    it('disables the native input, so the platform blocks interaction', () => {
      expect(input('disabled').disabled).toBe(true);
    });

    it('does not toggle when clicked', () => {
      const before = input('disabled').checked;
      input('disabled').click();
      fixture.detectChanges();
      expect(input('disabled').checked).toBe(before);
    });
  });

  describe('name', () => {
    it('is forwarded for form submission', () => {
      expect(input('named').getAttribute('name')).toBe('terms');
    });

    it('is absent rather than empty when unset', () => {
      // `name=""` is a submitted field with no name, which is not the same as
      // a field that does not submit.
      expect(input('unnamed').hasAttribute('name')).toBe(false);
    });
  });

  describe('touch', () => {
    it('emits on blur', () => {
      input('touch').dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();
      expect(fixture.componentInstance.touches).toBe(1);
    });

    it('does not emit merely from being rendered', () => {
      expect(el.querySelector('[data-probe="plain"]')).toBeTruthy();
      // A control that reports itself touched on creation marks a form touched
      // before the user has been anywhere near it.
      expect(fixture.componentInstance.touches).toBe(0);
    });
  });

  describe('identity', () => {
    it('gives each instance a distinct input id', () => {
      const ids = ['plain', 'indeterminate', 'disabled'].map((p) => input(p).id);
      expect(new Set(ids).size).toBe(3);
      expect(ids[0]).toMatch(/^tk-checkbox-\d+-input$/);
    });
  });
});
