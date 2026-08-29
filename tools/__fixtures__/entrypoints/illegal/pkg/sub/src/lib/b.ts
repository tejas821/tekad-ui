// Crosses an entry-point boundary with a relative path. ng-packagr fails on
// this with an unreadable internal crash; the gate must catch it first.
import { a } from '../../../src/lib/a';
export const b = a + 1;
