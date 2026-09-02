import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadDialog } from './tekad-dialog';

/**
 * What jsdom can honestly say about a dialog: almost nothing.
 *
 * `packages/overlay/src/lib/unit-test-dom.spec.ts` measured the unit runner's
 * DOM and asserts each absence — no `showModal`, no top layer, no `inert`, no
 * Web Animations. This component's entire reason for existing is those four
 * things, so opening it here is not "a test that needs a shim", it is a test of
 * something that does not exist in this environment.
 *
 * So this suite covers the static rendering and the accessible-name wiring —
 * which is real, testable, and the part most likely to rot — and every
 * behavioural claim lives in `tools/verify-dialog-behaviour.mjs`.
 *
 * That division is Phase 8's finding, not a convenience: a spec written here
 * against a shimmed `showModal` would be a double wearing the platform's name,
 * and would read as browser-backed evidence while proving nothing about the
 * top layer.
 */
@Component({
  standalone: true,
  imports: [TekadDialog],
  template: `
    <tk-dialog data-probe="titled" heading="Delete this?">
      <p>This cannot be undone.</p>
    </tk-dialog>
    <tk-dialog data-probe="untitled"><p>Body only.</p></tk-dialog>
    <tk-dialog data-probe="explicit" id="chosen" heading="Named" />
  `,
})
class Host {
  readonly open = signal(false);
}

describe('TekadDialog', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;

  const host = (p: string) => el.querySelector(`[data-probe="${p}"]`) as HTMLElement;
  const dialog = (p: string) => host(p).querySelector('dialog') as HTMLDialogElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  describe('the element', () => {
    it('is a real <dialog>, not a div wearing role="dialog"', () => {
      // Everything the component declines to implement — the focus trap,
      // background inertness, aria-modal, Escape, focus restoration — comes
      // from this element and showModal(). A div gets none of it.
      expect(dialog('titled').tagName).toBe('DIALOG');
      expect(dialog('titled').hasAttribute('role')).toBe(false);
    });

    it('is closed until asked to open', () => {
      expect(dialog('titled').hasAttribute('open')).toBe(false);
    });
  });

  describe('the accessible name', () => {
    it('points aria-labelledby at the visible heading', () => {
      const labelledBy = dialog('titled').getAttribute('aria-labelledby');
      const target = host('titled').querySelector(`#${CSS.escape(labelledBy ?? '')}`);
      // Resolved, not merely present. A dialog whose aria-labelledby names
      // nothing is announced as "dialog" and nothing else — the same failure
      // as an unlabelled one, but harder to spot.
      expect(target).toBeTruthy();
      expect(target?.textContent?.trim()).toBe('Delete this?');
    });

    it('uses a real heading element, so the name is also readable', () => {
      const h = host('titled').querySelector('h2');
      expect(h).toBeTruthy();
      expect(dialog('titled').hasAttribute('aria-label')).toBe(false);
    });

    it('omits aria-labelledby entirely when there is no heading', () => {
      // Pointing at a heading that was never rendered is worse than having no
      // name: it claims one and resolves to nothing.
      expect(dialog('untitled').hasAttribute('aria-labelledby')).toBe(false);
      expect(host('untitled').querySelector('h2')).toBeNull();
    });
  });

  describe('identity', () => {
    it('lets an explicit id win', () => {
      expect(dialog('explicit').id).toBe('chosen');
    });

    it('derives the heading id from the dialog id, so both stay in step', () => {
      expect(dialog('explicit').getAttribute('aria-labelledby')).toBe('chosen-heading');
    });

    it('generates a distinct id otherwise', () => {
      expect(dialog('titled').id).toMatch(/^tk-dialog-\d+$/);
      expect(dialog('titled').id).not.toBe(dialog('untitled').id);
    });
  });

  describe('content', () => {
    it('projects the consumer’s content', () => {
      expect(host('titled').querySelector('p')?.textContent).toBe('This cannot be undone.');
    });
  });
});
