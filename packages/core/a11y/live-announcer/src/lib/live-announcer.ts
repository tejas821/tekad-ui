import { DOCUMENT, Injectable, inject, DestroyRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * How urgently a message interrupts the user.
 *
 * `polite` waits for a pause. `assertive` interrupts immediately, and should be
 * rare: it talks over whatever the user was reading, so it is for things they
 * must know *now* — a submission failed, a session is about to expire — not for
 * things that are merely important to the developer.
 */
export type TekadAnnouncePoliteness = 'polite' | 'assertive';

/**
 * Announces a message to assistive technology without moving focus.
 *
 * ADR-005 established that `@angular/aria` ships no live announcer, so this is
 * a gap TEKAD owns. It is deliberately the smallest thing that works, because
 * live regions are unusually easy to get subtly wrong and every extra feature
 * is another way to be wrong.
 *
 * ── Why the region is created lazily ─────────────────────────────────────
 *
 * Not at import time, and not in a constructor that might run on a server. SSR
 * has no DOM; touching `document` at module scope would break the server
 * render, and creating the region during hydration would produce a node the
 * server never emitted, which is a hydration mismatch. Creating it on first use
 * in the browser avoids both, and costs an application that never announces
 * anything precisely nothing.
 *
 * ── Why a message is cleared before it is set ────────────────────────────
 *
 * A live region only fires when its content CHANGES. Announcing the same string
 * twice — "3 results", filter, "3 results" — sets identical text, so the second
 * announcement is silently dropped and the user is told nothing. Clearing the
 * region first, then setting the text in a later task, guarantees a change the
 * screen reader observes.
 *
 * ── Why there are two regions, created together ──────────────────────────
 *
 * `aria-live` politeness is read when the region is first encountered, so
 * flipping the attribute on a single shared region is unreliable across
 * implementations. Two regions, one per politeness, avoids the question. They
 * are created together so neither is inserted mid-announcement.
 */
@Injectable({ providedIn: 'root' })
export class TekadLiveAnnouncer {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** @internal */
  #regions: Record<TekadAnnouncePoliteness, HTMLElement> | null = null;
  /** @internal */
  #pending: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#teardown());
  }

  /**
   * Announce `message` to assistive technology.
   *
   * Does nothing on the server, and nothing for an empty message — an empty
   * announcement is always a bug in the caller, and making it a silent no-op is
   * kinder than announcing nothing audibly and leaving them to wonder.
   *
   * @param message the text to announce
   * @param politeness defaults to `polite`; see {@link TekadAnnouncePoliteness}
   */
  announce(message: string, politeness: TekadAnnouncePoliteness = 'polite'): void {
    if (!this.#isBrowser) return;
    const text = message.trim();
    if (text.length === 0) return;

    const region = this.#ensureRegions()[politeness];

    // Clear first so the upcoming assignment is always a CHANGE, even when the
    // text is identical to what was announced a moment ago.
    region.textContent = '';
    if (this.#pending !== null) clearTimeout(this.#pending);
    this.#pending = setTimeout(() => {
      region.textContent = text;
      this.#pending = null;
    });
  }

  /**
   * Empty both regions.
   *
   * Useful when a view is torn down mid-announcement and the message would
   * otherwise be read after the thing it describes has gone.
   */
  clear(): void {
    if (this.#pending !== null) {
      clearTimeout(this.#pending);
      this.#pending = null;
    }
    if (this.#regions) {
      this.#regions.polite.textContent = '';
      this.#regions.assertive.textContent = '';
    }
  }

  /** @internal */
  #ensureRegions(): Record<TekadAnnouncePoliteness, HTMLElement> {
    if (this.#regions) return this.#regions;
    this.#regions = {
      polite: this.#createRegion('polite'),
      assertive: this.#createRegion('assertive'),
    };
    return this.#regions;
  }

  /** @internal */
  #createRegion(politeness: TekadAnnouncePoliteness): HTMLElement {
    const el = this.#document.createElement('div');
    el.setAttribute('aria-live', politeness);

    // role=status / role=alert alongside aria-live: some assistive technology
    // keys off the role rather than the attribute, and the pairing is the
    // combination with the broadest support.
    el.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');

    // aria-atomic=true so the whole message is read rather than only the words
    // that changed — without it, "5 results" following "3 results" can be read
    // as just "5".
    el.setAttribute('aria-atomic', 'true');

    // Visually hidden, but NOT display:none, visibility:hidden, or hidden —
    // each of those removes the element from the accessibility tree entirely,
    // which is the single most common way a live region ends up announcing
    // nothing at all. Clipping keeps it rendered and readable.
    Object.assign(el.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      margin: '-1px',
      padding: '0',
      border: '0',
      overflow: 'hidden',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap',
    });

    this.#document.body.appendChild(el);
    return el;
  }

  /** @internal */
  #teardown(): void {
    this.clear();
    this.#regions?.polite.remove();
    this.#regions?.assertive.remove();
    this.#regions = null;
  }
}
