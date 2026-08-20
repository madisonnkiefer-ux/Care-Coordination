import "server-only";

// Per-IP fixed-window counter, in memory. Safe *because* this app runs as a
// single ECS task with no autoscaling (infra/ecs.tf's app_desired_count is
// pinned to 1 until real multi-clinic usage justifies more — see
// infra/README.md). If that ever changes, this needs to move to a shared
// store (Redis/Upstash) instead — each task would otherwise keep its own
// independent count, silently multiplying the effective limit by the
// number of tasks.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Bounds memory growth from distinct IPs over time — each bucket is tiny,
// but should still not accumulate forever on a long-running process.
const cleanup = setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  },
  5 * 60 * 1000
);
cleanup.unref();

// Returns true if the call is allowed, false if `key` has hit `limit`
// within the current `windowMs` window.
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;

  bucket.count++;
  return true;
}
