import { describe, expect, it } from 'vitest';
import { isAccessCode, isUnlocked, markUnlocked } from './access';

describe('toegangscode', () => {
  it('accepteert 6402, ook met spaties of streepjes', () => {
    expect(isAccessCode('6402')).toBe(true);
    expect(isAccessCode(' 64 02 ')).toBe(true);
  });
  it('weigert andere invoer', () => {
    expect(isAccessCode('')).toBe(false);
    expect(isAccessCode('6401')).toBe(false);
    expect(isAccessCode('64020')).toBe(false);
  });
  it('onthoudt het ontgrendelen voor deze sessie', () => {
    expect(isUnlocked()).toBe(false);
    markUnlocked();
    expect(isUnlocked()).toBe(true);
  });
});
