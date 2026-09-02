import { describe, it, expect, beforeEach } from 'vitest';
import { Component, computed, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideTekadModelControl, type TekadModelControl } from '@tekad/core/forms/model-control';
import { TekadCompatAdapter } from './compat-adapter';

/**
 * The adapter's own logic, against a STUB control.
 *
 * ── Why a stub and not the real checkbox ──────────────────────────────────
 *
 * `@tekad/forms` is tagged `layer:foundation`, and a foundation package may not
 * depend on a component. That is not a lint technicality — the adapter must
 * work with any control that provides `TEKAD_MODEL_CONTROL`, and a suite that
 * reached for `@tekad/checkbox` would quietly encode one component's behaviour
 * into the adapter's definition of correct. `@nx/enforce-module-boundaries`
 * caught the first version of this file doing exactly that.
 *
 * The stub is therefore not a shortcut; it is the whole contract, written out.
 * If the adapter needs something this stub does not have, the token's interface
 * is too small and that is the thing to fix.
 *
 * The integration — real control, real adapter, real `FormControl` — is in
 * `packages/checkbox/src/lib/checkbox-compat.spec.ts`, where the dependency
 * runs the legal way round.
 */
@Component({
  selector: 'tk-stub-control',
  standalone: true,
  template: '',
  providers: [provideTekadModelControl(StubControl)],
})
class StubControl implements TekadModelControl<boolean> {
  readonly model = signal(false);
  readonly disabledByForm = signal(false);
  readonly effectivelyDisabled = computed(() => this.disabledByForm());
  readonly touch = output<void>();

  /** Test-only: stands in for the blur a real control listens to. */
  blur(): void {
    this.touch.emit();
  }
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, StubControl, TekadCompatAdapter],
  template: `<tk-stub-control tkCompat [formControl]="ctrl" />`,
})
class Host {
  readonly ctrl = new FormControl(false);
}

describe('TekadCompatAdapter', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let control: StubControl;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    control = fixture.debugElement.children[0]?.componentInstance as StubControl;
  });

  describe('form to control', () => {
    it('writes the initial value into the model', () => {
      expect(control.model()).toBe(false);
    });

    it('pushes a later setValue into the model', () => {
      fixture.componentInstance.ctrl.setValue(true);
      fixture.detectChanges();
      expect(control.model()).toBe(true);
    });

    it('routes a form disable to disabledByForm, not to the author input', () => {
      fixture.componentInstance.ctrl.disable();
      fixture.detectChanges();
      // The two channels have different owners and must not be collapsed: an
      // author's [disabled]="false" would otherwise fight control.disable() on
      // every change detection.
      expect(control.disabledByForm()).toBe(true);
    });

    it('clears it again on enable', () => {
      fixture.componentInstance.ctrl.disable();
      fixture.detectChanges();
      fixture.componentInstance.ctrl.enable();
      fixture.detectChanges();
      expect(control.disabledByForm()).toBe(false);
    });
  });

  describe('control to form', () => {
    it('reports a model change to the FormControl', () => {
      control.model.set(true);
      fixture.detectChanges();
      expect(fixture.componentInstance.ctrl.value).toBe(true);
    });

    it('marks the form dirty when the control changed', () => {
      control.model.set(true);
      fixture.detectChanges();
      expect(fixture.componentInstance.ctrl.dirty).toBe(true);
    });

    it('marks the form touched when the control emits touch', () => {
      expect(fixture.componentInstance.ctrl.touched).toBe(false);
      control.blur();
      fixture.detectChanges();
      // Subscribed to the control's own `touch` OutputRef — the same one the
      // signal-forms contract requires — so both form systems see one event.
      expect(fixture.componentInstance.ctrl.touched).toBe(true);
    });
  });

  describe('the echo', () => {
    /**
     * The one a hand-rolled adapter gets wrong.
     *
     * A signal effect does not run inline with the write that triggered it; it
     * is scheduled. So the obvious `#writing = true` flag around `model.set()`
     * is already cleared by the time the effect runs, the effect sees the
     * form's own value, and reports it back as a user edit.
     *
     * The symptom is not an error. It is a form that is dirty the moment it is
     * populated — and, for a form that reacts to `valueChanges`, a loop.
     */
    it('does not mark the form dirty when the FORM set the value', () => {
      fixture.componentInstance.ctrl.setValue(true);
      fixture.detectChanges();
      expect(fixture.componentInstance.ctrl.dirty).toBe(false);
    });

    it('is not dirty or touched merely from being rendered', () => {
      expect(fixture.componentInstance.ctrl.dirty).toBe(false);
      expect(fixture.componentInstance.ctrl.touched).toBe(false);
    });

    /**
     * The echo is swallowed ONCE, not forever. A guard that remembers "ignore
     * this value" permanently looks correct until the control returns to the
     * value the form last wrote, at which point a real edit disappears.
     */
    it('still reports a user edit that happens to match an earlier form write', () => {
      fixture.componentInstance.ctrl.setValue(true);
      fixture.detectChanges();
      expect(fixture.componentInstance.ctrl.dirty).toBe(false);

      control.model.set(false);
      fixture.detectChanges();
      expect(fixture.componentInstance.ctrl.value).toBe(false);

      control.model.set(true); // back to the value the form once wrote
      fixture.detectChanges();
      expect(fixture.componentInstance.ctrl.value).toBe(true);
      expect(fixture.componentInstance.ctrl.dirty).toBe(true);
    });
  });
});
