import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TekadLiveAnnouncer } from './live-announcer';

/**
 * Unit tests for `TekadLiveAnnouncer`.
 *
 * ── What these tests are for, and what they are NOT for ──────────────────
 *
 * `tools/verify-live-announcer.mjs` already runs 15 checks in a real Chromium
 * and asserts the region's shape and computed style — that it is clipped
 * rather than `display:none`, that it survives in the accessibility tree.
 * Repeating that here would be attribute-counting in a DOM that has no
 * accessibility tree to be wrong about, which CLAUDE.md's Definition of Done
 * explicitly rules out.
 *
 * What jsdom CAN witness is the part a browser gate cannot: the **sequence of
 * mutations**. A live region announces on CHANGE, so the service's central
 * claim is not "the text ends up right" — it is "the text was observed to
 * change". Only a mutation record can tell those apart, and the case that
 * separates them is announcing the same string twice.
 *
 * No screen reader is involved in any of this, here or in the browser gate.
 * Neither proves a user hears anything. What they prove is that the DOM
 * presents the change a screen reader is specified to act on — which is the
 * most that can be shown without a human and a screen reader in the room.
 * That obligation stays open and is tracked as such.
 */

/** Collect every textContent the region passes through, in order. */
function recordText(el: Element): { values: string[]; stop: () => void } {
  const values: string[] = [el.textContent ?? ''];
  const obs = new MutationObserver(() => values.push(el.textContent ?? ''));
  obs.observe(el, { childList: true, characterData: true, subtree: true });
  return { values, stop: () => obs.disconnect() };
}

const regions = () => Array.from(document.body.querySelectorAll('[aria-live]'));
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('TekadLiveAnnouncer', () => {
  afterEach(() => {
    for (const el of regions()) el.remove();
  });

  describe('in a browser', () => {
    let announcer: TekadLiveAnnouncer;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      announcer = TestBed.inject(TekadLiveAnnouncer);
    });

    it('creates nothing until something is announced', () => {
      // The SSR-safety claim in the class docs: no DOM is touched at
      // construction, so injecting the service on a server render is inert.
      expect(regions()).toHaveLength(0);
    });

    it('creates both regions on first use and never creates more', async () => {
      announcer.announce('one');
      await flush();
      expect(regions()).toHaveLength(2);

      for (const m of ['two', 'three', 'four']) {
        announcer.announce(m);
        await flush();
      }
      // A region per announcement is the classic leak in this kind of service:
      // it "works" and grows the accessibility tree without bound.
      expect(regions()).toHaveLength(2);
    });

    it('routes politeness to separate regions', async () => {
      announcer.announce('quiet', 'polite');
      await flush();
      announcer.announce('loud', 'assertive');
      await flush();

      const polite = document.body.querySelector('[aria-live="polite"]');
      const assertive = document.body.querySelector('[aria-live="assertive"]');
      expect(polite?.textContent).toBe('quiet');
      expect(assertive?.textContent).toBe('loud');
    });

    /**
     * The one that matters. Everything else in this file would still pass if
     * the service assigned `textContent` directly.
     */
    it('is OBSERVED to change when the same message is announced twice', async () => {
      announcer.announce('3 results');
      await flush();

      const region = document.body.querySelector('[aria-live="polite"]');
      expect(region).toBeTruthy();
      const rec = recordText(region as Element);

      announcer.announce('3 results');
      await flush();
      rec.stop();

      // Not "it ends up saying 3 results" — it already did. The region must
      // have passed through empty, or a screen reader observes no change and
      // the user is told nothing.
      expect(rec.values).toContain('');
      expect(rec.values.at(-1)).toBe('3 results');
      expect(rec.values.length).toBeGreaterThan(1);
    });

    it('empties the region synchronously, before the text arrives', () => {
      announcer.announce('first');
      // Deliberately no flush. The clear is synchronous and the set is not;
      // if both were synchronous the repeat case above would silently break.
      const region = document.body.querySelector('[aria-live="polite"]');
      expect(region?.textContent).toBe('');
    });

    it('does not announce a message that clear() overtook', async () => {
      announcer.announce('stale');
      announcer.clear();
      await flush();

      const region = document.body.querySelector('[aria-live="polite"]');
      // A view torn down mid-announcement must not have its message read out
      // after the thing it described is gone.
      expect(region?.textContent ?? '').toBe('');
    });

    it('drops a superseded announcement rather than reading both', async () => {
      announcer.announce('outdated');
      announcer.announce('current');
      await flush();

      const region = document.body.querySelector('[aria-live="polite"]');
      expect(region?.textContent).toBe('current');
    });

    it('ignores an empty or whitespace-only message, and stays inert doing it', async () => {
      announcer.announce('');
      announcer.announce('   \n\t ');
      await flush();
      // Not merely "says nothing" — it must not have built the regions either,
      // or an app that only ever announces empty strings still pays for them.
      expect(regions()).toHaveLength(0);
    });

    it('trims the message it announces', async () => {
      announcer.announce('  padded  ');
      await flush();
      expect(document.body.querySelector('[aria-live="polite"]')?.textContent).toBe('padded');
    });

    it('removes its regions when the injector is destroyed', async () => {
      announcer.announce('temporary');
      await flush();
      expect(regions()).toHaveLength(2);

      TestBed.resetTestingModule(); // destroys the root injector
      expect(regions()).toHaveLength(0);
    });

    it('survives clear() before anything was ever announced', () => {
      expect(() => {
        announcer.clear();
      }).not.toThrow();
    });
  });

  describe('on the server', () => {
    it('touches no DOM', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const announcer = TestBed.inject(TekadLiveAnnouncer);

      announcer.announce('server-side');
      announcer.announce('urgent', 'assertive');
      await flush();

      // The hydration-mismatch claim, tested. A node created here would not
      // exist in the server's markup and would not exist in the client's
      // either — it would appear during hydration, which is the failure the
      // lazy creation exists to prevent.
      expect(regions()).toHaveLength(0);
    });
  });
});
