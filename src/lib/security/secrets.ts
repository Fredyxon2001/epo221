import { timingSafeEqual } from 'node:crypto';
export function secretMatches(provided: string | null, expected: string | undefined | null): boolean {
  if (!provided || !expected || provided.length > 1000) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function cronAuthorized(request: Request) {
  return !!process.env.CRON_SECRET && secretMatches(request.headers.get('authorization'), `Bearer ${process.env.CRON_SECRET}`);
}
