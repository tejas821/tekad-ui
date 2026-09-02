import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadButton, type TekadButtonAppearance } from './tekad-button';

/**
 * `TekadButton` decorates a native `<button>` rather than replacing it, so most
 * of what it must do is *not break* things the platform already does. That
 * shapes these tests: several of them would pass against an empty directive,
 * and they are here precisely to fail if the decoration starts interfering.
 *
 * Styling is not tested here. Colours, focus rings and forced-colors mapping
 * need computed style in a real engine, and jsdom has no layout — see
 * `packages/overlay/src/lib/unit-test-dom.spec.ts` for how little of the DOM
 * this runner has. Those belong to the browser gates.
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
      <button tkButton [appearance]="appearance()">appearance</button>
      <button tkButton class="mine other">consumer classes</button>
      <button tkButton disabled (click)="clicked = clicked + 1">disabled</button>
    </form>
  `,
})
class Host {
  submitted = 0;
  clicked = 0;
  readonly appearance = signal<TekadButtonAppearance>('filled');
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
  const at = (i: number) => buttons()[i] as HTMLButtonElement;

  describe('the type default', () => {
    it('renders type="button"', () => {
      expect(at(1).getAttribute('type')).toBe('button');
    });

    it('does not submit the form it sits in — which is why the default exists', () => {
      at(1).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.submitted).toBe(0);
    });

    it('still submits when asked to', () => {
      at(3).click();
      fixture.detectChanges();
      // If this reads 0 the environment does not implement implicit submission,
      // and the test above proves nothing — so it is asserted, not assumed.
      expect(fixture.componentInstance.submitted).toBe(1);
    });
  });

  describe('identity', () => {
    it('lets an explicit id win', () => {
      expect(at(0).getAttribute('id')).toBe('explicit');
    });

    it('gives each instance without an id a different one', () => {
      // Duplicate ids break every aria-labelledby that points at one, silently:
      // the reference resolves to whichever element the browser found first.
      const a = at(1).getAttribute('id');
      const b = at(2).getAttribute('id');
      expect(a).toMatch(/^tk-button-\d+$/);
      expect(a).not.toBe(b);
    });
  });

  describe('appearance', () => {
    it('defaults to filled', () => {
      expect(at(1).classList.contains('tk-button--filled')).toBe(true);
    });

    it('carries the base class as well as the variant', () => {
      // The stylesheet puts layout on .tk-button and only re-points tokens in
      // the variant class, so losing the base class loses everything.
      expect(at(1).classList.contains('tk-button')).toBe(true);
    });

    it('swaps the variant class when the input changes, leaving no stale one', () => {
      fixture.componentInstance.appearance.set('outlined');
      fixture.detectChanges();
      expect(at(4).classList.contains('tk-button--outlined')).toBe(true);
      expect(at(4).classList.contains('tk-button--filled')).toBe(false);
    });

    /**
     * The one that would actually break a consumer.
     *
     * The host uses a single `[class]` binding rather than several `[class.x]`
     * bindings. Angular is documented to merge a static `class` attribute with
     * a `[class]` binding — but "documented" is not "measured", and if it did
     * not, every consumer's own class would be silently erased the moment they
     * added `tkButton` to an existing button.
     */
    it("does not erase the consumer's own classes", () => {
      const c = at(5).classList;
      expect(c.contains('mine')).toBe(true);
      expect(c.contains('other')).toBe(true);
      expect(c.contains('tk-button')).toBe(true);
    });
  });

  describe('what the native element still does', () => {
    it('does not fire click on a disabled button', () => {
      at(6).click();
      fixture.detectChanges();
      // Not a test of TEKAD code — a test that TEKAD code has not got in the
      // way of it. Decorating a native button is only worth doing if the
      // native behaviour survives.
      expect(fixture.componentInstance.clicked).toBe(0);
    });

    it('leaves the element a real button, not a div wearing a role', () => {
      // ADR-007 decision 7: forced-colors maps by element semantics. This is
      // the property that mapping depends on, and a refactor to a <tk-button>
      // wrapper would break it without breaking anything else.
      expect(at(1).tagName).toBe('BUTTON');
      expect(at(1).hasAttribute('role')).toBe(false);
    });
  });
});
