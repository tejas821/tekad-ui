/**
 * `@tekad/core/forms/model-control`
 *
 * The seam between a TEKAD control and the Reactive Forms adapter in
 * `@tekad/forms/compat`.
 *
 * It exists because of a measurement, not a preference. ADR-013 originally said
 * Angular forbids one class implementing both `ControlValueAccessor` and a
 * signal-forms contract. It does not — measured in 22.1.4, it accepts the
 * component, silently prefers the CVA, and the signal-forms model never binds.
 * The control compiles, boots, renders and does not work.
 *
 * So the adapter has to be a SEPARATE class, and a separate class needs a way
 * to reach the control's model. This token is that way, and it is deliberately
 * the smallest surface that works: one writable model, one touch notification,
 * one disabled channel.
 */
export {
  TEKAD_MODEL_CONTROL,
  provideTekadModelControl,
  type TekadModelControl,
} from './lib/model-control';
