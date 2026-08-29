/**
 * TEKAD forms probe — what does Angular ACTUALLY do when a component
 * implements both `ControlValueAccessor` and `FormValueControl`?
 *
 * ADR-013 states: "Angular explicitly forbids implementing both
 * `ControlValueAccessor` and `FormValueControl` on the same component." The
 * whole shape of Phase 7 rests on that sentence — it is why the reactive-forms
 * adapter ships as a separate entry point rather than as a second interface on
 * the same control.
 *
 * Reading `@angular/forms` 22.1.4 suggests something different. `FormField`'s
 * `ɵngControlCreate` resolves in this order:
 *
 *     if (this.controlValueAccessor)        -> cvaControlCreate
 *     else if (host.customControl)          -> customControlCreate
 *     else if (elementIsNativeFormElement)  -> nativeControlCreate
 *     else                                  -> throw
 *
 * No branch rejects a host that satisfies more than one. If that reading is
 * right, a component implementing both does not fail — the CVA silently wins
 * and the `FormValueControl` contract is never used at all.
 *
 * Which of those two stories is true changes what TEKAD must defend against, so
 * this app renders three controls and reports what the framework actually did.
 */
import { Component, forwardRef, model, output, signal, type ModelSignal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { FormField, form, type FormValueControl } from '@angular/forms/signals';

declare global {
  interface Window {
    TEKAD_FORMS_READY?: boolean;
    tekadProbe?: {
      setBoth: (v: string) => void;
      setSignalOnly: (v: string) => void;
      readModel: () => { both: string; signalOnly: string };
      readCva: () => { writeValueCalls: number; lastWritten: string | null };
      errors: () => string[];
    };
  }
}

const errors: string[] = [];

/* ---------------------------------------------------------------------------
 * A. Implements BOTH. This is the configuration ADR-013 says is forbidden.
 * ------------------------------------------------------------------------- */
let cvaWriteValueCalls = 0;
let cvaLastWritten: string | null = null;

@Component({
  selector: 'tk-both-control',
  standalone: true,
  template: `<span data-probe="both">{{ value() }}</span>`,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BothControl), multi: true },
  ],
})
export class BothControl implements FormValueControl<string>, ControlValueAccessor {
  /** The signal-forms contract. */
  readonly value: ModelSignal<string> = model<string>('');
  readonly touch = output<void>();

  /** The reactive-forms contract, on the same class. */
  writeValue(v: string): void {
    cvaWriteValueCalls++;
    cvaLastWritten = v;
  }
  registerOnChange(_fn: (v: string) => void): void {
    /* not needed for what this probe measures */
  }
  registerOnTouched(_fn: () => void): void {
    /* not needed for what this probe measures */
  }
}

/* ---------------------------------------------------------------------------
 * B. The CONTROL: signal-forms contract only. If the value model does not bind
 *    here either, the probe is measuring nothing.
 * ------------------------------------------------------------------------- */
@Component({
  selector: 'tk-signal-control',
  standalone: true,
  template: `<span data-probe="signal">{{ value() }}</span>`,
})
export class SignalOnlyControl implements FormValueControl<string> {
  readonly value: ModelSignal<string> = model<string>('');
  readonly touch = output<void>();
}

/* ------------------------------------------------------------------------- */
@Component({
  selector: 'tk-forms-probe',
  standalone: true,
  imports: [FormField, BothControl, SignalOnlyControl],
  template: `
    <tk-both-control [formField]="f.both" />
    <tk-signal-control [formField]="f.signalOnly" />
  `,
})
export class ProbeRoot {
  readonly data = signal({ both: 'initial-both', signalOnly: 'initial-signal' });
  readonly f = form(this.data);
}

void bootstrapApplication(ProbeRoot, {
  providers: [
    {
      provide: 'ERROR_SINK',
      useValue: null,
    },
  ],
})
  .then((app) => {
    const root = app.components[0]?.instance as ProbeRoot | undefined;
    window.tekadProbe = {
      setBoth: (v: string) => {
        root?.f.both().value.set(v);
      },
      setSignalOnly: (v: string) => {
        root?.f.signalOnly().value.set(v);
      },
      readModel: () => ({
        both: document.querySelector('[data-probe="both"]')?.textContent ?? '',
        signalOnly: document.querySelector('[data-probe="signal"]')?.textContent ?? '',
      }),
      readCva: () => ({ writeValueCalls: cvaWriteValueCalls, lastWritten: cvaLastWritten }),
      errors: () => errors,
    };
    window.TEKAD_FORMS_READY = true;
  })
  .catch((e: unknown) => {
    errors.push(String((e as Error)?.message ?? e));
    window.tekadProbe = {
      setBoth: () => {},
      setSignalOnly: () => {},
      readModel: () => ({ both: '', signalOnly: '' }),
      readCva: () => ({ writeValueCalls: cvaWriteValueCalls, lastWritten: cvaLastWritten }),
      errors: () => errors,
    };
    window.TEKAD_FORMS_READY = true;
  });
