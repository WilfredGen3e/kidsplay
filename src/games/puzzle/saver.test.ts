import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebouncedSaver } from './saver';

describe('createDebouncedSaver', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('bewaart pas na een stilte, en alleen de laatste waarde', () => {
    const save = vi.fn();
    const saver = createDebouncedSaver<number>(save, 500);
    saver.schedule(1);
    vi.advanceTimersByTime(300);
    saver.schedule(2);
    vi.advanceTimersByTime(300);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(2);
  });

  it('schrijft direct bij flush en daarna niet nog eens', () => {
    const save = vi.fn();
    const saver = createDebouncedSaver<string>(save, 500);
    saver.schedule('a');
    saver.flush();
    expect(save).toHaveBeenCalledWith('a');
    vi.advanceTimersByTime(2000);
    expect(save).toHaveBeenCalledTimes(1);
    saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('gooit de wachtende waarde weg bij cancel', () => {
    const save = vi.fn();
    const saver = createDebouncedSaver<string>(save, 500);
    saver.schedule('oud');
    saver.cancel();
    vi.advanceTimersByTime(2000);
    saver.flush();
    expect(save).not.toHaveBeenCalled();
    expect(saver.hasPending()).toBe(false);
  });

  it('kan daarna gewoon opnieuw gebruikt worden', () => {
    const save = vi.fn();
    const saver = createDebouncedSaver<number>(save, 100);
    saver.schedule(1);
    vi.advanceTimersByTime(100);
    saver.schedule(2);
    vi.advanceTimersByTime(100);
    expect(save.mock.calls).toEqual([[1], [2]]);
  });
});
