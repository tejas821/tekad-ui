import { describe, it, expect, beforeEach } from 'vitest';
import { uniqueId, resetUniqueIdCounterForTesting } from './unique-id';

describe('uniqueId', () => {
  beforeEach(() => resetUniqueIdCounterForTesting());

  it('never returns the same id twice', () => {
    const ids = new Set(Array.from({ length: 500 }, () => uniqueId('tk')));
    expect(ids.size).toBe(500);
  });

  it('keeps the prefix, because it shows up in accessibility tree dumps', () => {
    expect(uniqueId('tk-listbox')).toMatch(/^tk-listbox-\d+$/);
  });

  it('produces the same sequence after a reset, which is what hydration needs', () => {
    const first = [uniqueId('a'), uniqueId('a'), uniqueId('a')];
    resetUniqueIdCounterForTesting();
    const second = [uniqueId('a'), uniqueId('a'), uniqueId('a')];
    expect(second).toEqual(first);
  });
});
