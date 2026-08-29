/**
 * Harness for tools/verify-live-announcer.mjs.
 *
 * Exposes the announcer on `window` so the driver can call it and then observe
 * the real DOM, in a real browser. The claims being checked are about what
 * assistive technology can perceive, and none of them can be established by
 * reading the source.
 */
import { createApplication } from '@angular/platform-browser';
import { TekadLiveAnnouncer } from '@tekad/core/a11y/live-announcer';

declare global {
  interface Window {
    TEKAD_A11Y_READY?: boolean;
    tekadAnnouncer?: TekadLiveAnnouncer;
    tekadDestroy?: () => void;
  }
}

void createApplication().then((app) => {
  window.tekadAnnouncer = app.injector.get(TekadLiveAnnouncer);
  window.tekadDestroy = () => app.destroy();
  window.TEKAD_A11Y_READY = true;
});
