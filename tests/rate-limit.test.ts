import { beforeEach, describe, expect, it } from 'vitest';
import { claimMemorySlot, resetMemorySlots } from '@/lib/data/rate-limit';

describe('claimMemorySlot', () => {
  beforeEach(() => resetMemorySlots());

  it('allows `limit` claims inside the window and refuses the next', () => {
    const t0 = 1_000_000;
    expect(claimMemorySlot('pdf:u1', 3, 60_000, t0)).toBe(true);
    expect(claimMemorySlot('pdf:u1', 3, 60_000, t0 + 1)).toBe(true);
    expect(claimMemorySlot('pdf:u1', 3, 60_000, t0 + 2)).toBe(true);
    expect(claimMemorySlot('pdf:u1', 3, 60_000, t0 + 3)).toBe(false);
    expect(claimMemorySlot('pdf:u1', 3, 60_000, t0 + 59_999)).toBe(false);
  });

  it('frees slots as old claims leave the window', () => {
    const t0 = 1_000_000;
    claimMemorySlot('s', 2, 60_000, t0);
    claimMemorySlot('s', 2, 60_000, t0 + 30_000);
    expect(claimMemorySlot('s', 2, 60_000, t0 + 50_000)).toBe(false);
    // The first claim ages out at t0 + 60_000.
    expect(claimMemorySlot('s', 2, 60_000, t0 + 60_001)).toBe(true);
    expect(claimMemorySlot('s', 2, 60_000, t0 + 60_002)).toBe(false);
  });

  it('keeps scopes independent and refuses a non-positive limit', () => {
    expect(claimMemorySlot('a', 1, 1000, 0)).toBe(true);
    expect(claimMemorySlot('b', 1, 1000, 0)).toBe(true);
    expect(claimMemorySlot('a', 1, 1000, 1)).toBe(false);
    expect(claimMemorySlot('c', 0, 1000, 0)).toBe(false);
  });
});
