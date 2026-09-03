type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * In-memory fixed-window limiter, keyed by whatever the caller passes (an
 * email for a login attempt, a user id for a 2FA code). Per Node process —
 * it resets on restart and doesn't share state across multiple server
 * instances. That's fine for stopping a scripted brute-force against a
 * single deployment (this app's current docker-compose setup runs one `app`
 * instance); a multi-instance production deployment would need a shared
 * store (e.g. Redis) instead.
 *
 * Returns true if the call is allowed (and counts it), false if the caller
 * should be rejected without doing the expensive/sensitive work.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Opportunistic sweep of expired buckets so memory doesn't grow unbounded
  // under an attacker cycling through many distinct keys (e.g. emails).
  // 1-in-200 odds keeps the sweep itself cheap on the common path.
  if (Math.random() < 0.005) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
