import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
  type ElementRef,
  type ModelSignal,
} from '@angular/core';
import { uniqueId } from '@tekad/core/primitives/identity';
import { TekadDeferredOverlay } from '@tekad/overlay';

/**
 * A modal dialog.
 *
 * ```html
 * <tk-dialog [(open)]="confirming" heading="Delete this?">
 *   <p>This cannot be undone.</p>
 *   <button tkButton (click)="confirming.set(false)">Cancel</button>
 * </tk-dialog>
 * ```
 *
 * ── What this component does NOT implement ────────────────────────────────
 *
 * A focus trap. Escape handling. Background inertness. `aria-modal`. Focus
 * restoration. Scroll locking on the top layer.
 *
 * `<dialog>.showModal()` provides every one of them, in the engine, correctly,
 * at 96.1% support. ADR-010 anticipated a bespoke focus trap; Phase 6 already
 * narrowed that to "only the `position: fixed` fallback path needs one", and
 * `tools/verify-dialog-behaviour.mjs` is where that narrowing is actually
 * measured rather than assumed — it Tabs through the dialog and asserts focus
 * never leaves, presses Escape, and checks focus returns to the trigger.
 *
 * This is CLAUDE.md rule 1 at its most literal. A hand-written focus trap is
 * several hundred lines that must know about `inert`, shadow roots,
 * `tabindex="-1"`, radio groups, `contenteditable`, iframes and the browser's
 * own sequential focus navigation — and it will be wrong in some of them.
 *
 * ── What it DOES implement ────────────────────────────────────────────────
 *
 * The exit animation, and only because the platform genuinely cannot: an
 * element in the top layer is removed from it the instant `close()` is called,
 * so a closing animation plays on an element that has already stopped being on
 * top of anything. `@tekad/overlay`'s deferred-close primitive is TEKAD's
 * answer, measured across 13 lifecycle cases in Chromium and WebKitGTK during
 * prototype P0.
 *
 * That primitive has had no consumer until now. This is it.
 *
 * ── The accessible name ───────────────────────────────────────────────────
 *
 * A modal dialog with no accessible name is announced as "dialog" and nothing
 * else. `heading` renders a real `<h2>` and points `aria-labelledby` at it, so
 * the visible heading IS the name — the same reasoning as the form field's
 * `<label>` rather than an `aria-label`.
 */
@Component({
  selector: 'tk-dialog',
  standalone: true,
  templateUrl: './tekad-dialog.html',
  styleUrl: './tekad-dialog.css',
  host: { class: 'tk-dialog-host' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TekadDialog {
  /**
   * Whether the dialog is showing.
   *
   * A `model`, so a consumer can both open it and be told when the platform
   * closed it — Escape and the backdrop are the browser's to handle, and a
   * one-way input would leave the consumer's state claiming it is still open.
   */
  readonly open: ModelSignal<boolean> = model<boolean>(false);

  /**
   * The visible heading, and the dialog's accessible name.
   *
   * Rendered as an `<h2>` that `aria-labelledby` points at, rather than set as
   * an `aria-label`: a name a sighted user can also read is the point, and
   * WCAG 2.2 SC 2.5.3 wants the accessible name to contain the visible text.
   */
  readonly heading = input<string>('');

  /** Emitted after the close animation has finished and the dialog is gone. */
  readonly closed = output<void>();

  /** An explicit id always wins; otherwise one is generated. */
  readonly id = input<string | undefined>(undefined);

  protected readonly resolvedId = computed(() => this.id() ?? this.generatedId);
  protected readonly headingId = computed(() => `${this.resolvedId()}-heading`);

  private readonly generatedId = uniqueId('tk-dialog');
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private overlay: TekadDeferredOverlay | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const el = this.dialogRef()?.nativeElement;
      if (!el) return;

      this.overlay ??= new TekadDeferredOverlay(el, {
        kind: 'dialog',
        // The primitive owns the CLOSE; opening is ours, because showModal()
        // throws if the element is already open and the primitive has no
        // reason to know about that.
        closeOp: () => {
          if (el.open) el.close();
        },
      });

      const overlay = this.overlay;
      if (this.open()) {
        if (!el.open) el.showModal();
        overlay.open();
      } else if (overlay.state !== 'closed') {
        overlay.close();
      }
    });

    destroyRef.onDestroy(() => {
      this.overlay?.destroy();
      this.overlay = null;
    });
  }

  /**
   * The platform closed the dialog — Escape, or a form method="dialog".
   *
   * Reflected back into the model rather than fought. A component that
   * reopened itself here because its input still said `true` would trap the
   * user in a dialog Escape appears not to close.
   */
  protected onNativeClose(): void {
    this.open.set(false);
    this.closed.emit();
  }

  /**
   * A click on the backdrop.
   *
   * The backdrop is `::backdrop`, which is not an element and cannot receive a
   * listener — but a click outside the dialog's own box still targets the
   * `<dialog>` element itself, because the element fills the viewport as far as
   * hit-testing is concerned. Comparing the target to the element is therefore
   * the standard way to detect it, and checking the click's coordinates against
   * the box is what distinguishes it from a click on the padding.
   */
  protected onDialogClick(event: MouseEvent): void {
    const el = this.dialogRef()?.nativeElement;
    if (!el || event.target !== el) return;
    const r = el.getBoundingClientRect();
    const inside =
      event.clientX >= r.left &&
      event.clientX <= r.right &&
      event.clientY >= r.top &&
      event.clientY <= r.bottom;
    if (!inside) this.open.set(false);
  }
}
