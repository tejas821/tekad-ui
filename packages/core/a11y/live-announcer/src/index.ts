/**
 * `@tekad/core/a11y/live-announcer`
 *
 * ADR-005 verified that `@angular/aria` ships no live announcer — a grep of
 * every published bundle in 22.1.4 returns zero matches for `aria-live`,
 * `LiveAnnouncer` or `announce`. This is one of the gaps TEKAD owns.
 *
 * It is its own secondary entry point so that an application that never
 * announces anything never pays for it.
 */
export { TekadLiveAnnouncer, type TekadAnnouncePoliteness } from './lib/live-announcer';
