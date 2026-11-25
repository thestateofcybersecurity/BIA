import { describe, expect, it } from 'vitest';
import { decodeTokenSegment } from '@/lib/safe-decode';

describe('decodeTokenSegment', () => {
  it('decodes a well-formed segment', () => {
    expect(decodeTokenSegment('abc%2Edef')).toBe('abc.def');
    expect(decodeTokenSegment('plain')).toBe('plain');
  });

  it('returns a malformed segment unchanged instead of throwing', () => {
    expect(decodeTokenSegment('%ff')).toBe('%ff');
    expect(decodeTokenSegment('%E0%A4%A')).toBe('%E0%A4%A');
    expect(decodeTokenSegment('%')).toBe('%');
  });
});
