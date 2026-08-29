import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadButton } from './tekad-button';

/**
 * `TekadButton` is a fixture, not the eventual TEKAD button — it exists to
 * prove the packaging model. It still has one piece of real behaviour, and it
 * is the one worth testing: the `type` default.
 *
 * An unset `type` on a `<button>` inside a `<form>` means `submit`. That is the
 * most common accidental bug in hand-rolled button components, and it is
 * invisible until the button happens to be placed in a form, at which point a
 * "Cancel" button navigates away with a half-filled form.
 *
 * So the assertion below is not "the attribute is set" — it is that a default
 * button placed in a form **does not submit it**. Those are different claims,
 * and only the second one is the reason the default exists.
 */
@Component({
  standalone: true,
  imports: [TekadButton],
  template: `
    <form (submit)="submitted = submitted + 1; $event.preventDefault()">
      <button tkButton id="explicit">explicit id</button>
      <button tkButton>generated</button>
      <button tkButton>also generated</button>
      <button tkButton type="submit">submits</button>
    </form>
  `,
})
class Host {
  submitted = 0;
}

describe('TekadButton', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  const buttons = () => Array.from(el.querySelectorAll('button'));

  it('defaults type to "button"', () => {
    expect(buttons()[1]?.getAttribute('type')).toBe('button');
  });

  it('does not submit the form it sits in — which is why the default exists', () => {
    buttons()[1]?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.submitted).toBe(0);
  });

  it('still submits when asked to', () => {
    buttons()[3]?.click();
    fixture.detectChanges();
    // If this reads 0, the environment does not implement implicit submission
    // and the test above proves nothing — so it is asserted rather than
    // assumed. See `packages/overlay/src/lib/unit-test-dom.spec.ts` for how
    // little of the DOM the unit runner actually has.
    expect(fixture.componentInstance.submitted).toBe(1);
  });

  it('lets an explicit id win', () => {
    expect(buttons()[0]?.getAttribute('id')).toBe('explicit');
  });

  it('gives each instance without an id a different one', () => {
    const generated = [buttons()[1], buttons()[2]].map((b) => b?.getAttribute('id'));
    // Duplicate ids break every aria-labelledby that points at one, silently:
    // the reference resolves to whichever element the browser found first.
    expect(generated[0]).toBeTruthy();
    expect(generated[0]).not.toBe(generated[1]);
    expect(generated[0]).toMatch(/^tk-button-\d+$/);
  });
});
