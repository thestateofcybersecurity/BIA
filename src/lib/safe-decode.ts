/**
 * Decode a URL path segment that carries a token. A malformed percent
 * sequence (for example a lone "%ff") makes decodeURIComponent throw, which
 * on a public page is an unauthenticated 500. The raw value is returned
 * instead: it will not verify as a token, and the page renders its normal
 * "not valid" state.
 */
export function decodeTokenSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
