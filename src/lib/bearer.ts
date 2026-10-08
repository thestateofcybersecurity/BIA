import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compare a request's Authorization header against `Bearer <secret>` in
 * constant time. Both sides are digested first so the comparison runs over
 * fixed-length buffers and a length mismatch leaks nothing either.
 */
export function bearerMatches(req: Request, secret: string): boolean {
  const presented = req.headers.get('authorization') ?? '';
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}
