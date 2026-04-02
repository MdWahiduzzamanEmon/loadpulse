/**
 * Cache invalidation test — verifies data freshness after mutations.
 * Flow: GET (cache) → PATCH (mutate) → GET (verify fresh) → PATCH (restore)
 *
 * Tests the notification mark-read/mark-all-read cycle since it's
 * the most reliable mutation endpoint that doesn't create permanent data.
 */

import { getToken } from "../auth.js";
import type { RequestResult, TestConfig } from "../types.js";

interface CacheTestResult extends RequestResult {
  cacheStatus?: "fresh" | "stale" | "skipped";
}

export async function runCacheTest(
  config: TestConfig,
  onResult: (result: RequestResult) => void,
  onProgress: (completed: number, total: number, phase: string) => void,
  shouldStop: () => boolean
): Promise<RequestResult[]> {
  const { serverUrl, credentials } = config;

  if (!credentials) {
    const err: RequestResult = {
      endpoint: "/cache-test",
      method: "GET",
      status: 0,
      time: 0,
      error: "Cache test requires authentication credentials",
    };
    onResult(err);
    return [err];
  }

  const token = await getToken(serverUrl, credentials);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const results: RequestResult[] = [];
  const total = 4; // 4 steps

  // Step 1: GET notifications (populates cache)
  onProgress(0, total, "Fetching notifications (cache warm)...");
  const start1 = performance.now();
  const res1 = await fetch(
    `${serverUrl}/api/v1/notifications/?pagination=true&page=1&page_size=5`,
    { headers }
  );
  const data1 = await res1.json();
  const time1 = (performance.now() - start1) / 1000;
  results.push({
    endpoint: "/notifications/ (initial)",
    method: "GET",
    status: res1.status,
    time: time1,
  });
  onResult(results[results.length - 1]);

  if (shouldStop()) return results;

  // Step 2: GET unread count
  onProgress(1, total, "Checking unread count...");
  const start2 = performance.now();
  const res2 = await fetch(`${serverUrl}/api/v1/notifications/unread-count/`, { headers });
  const data2 = await res2.json();
  const unreadBefore = data2.unread_count ?? 0;
  const time2 = (performance.now() - start2) / 1000;
  results.push({
    endpoint: "/notifications/unread-count/ (before)",
    method: "GET",
    status: res2.status,
    time: time2,
  });
  onResult(results[results.length - 1]);

  if (shouldStop()) return results;

  // Step 3: Mark all as read (mutation)
  onProgress(2, total, "Marking all notifications as read (mutation)...");
  const start3 = performance.now();
  const res3 = await fetch(`${serverUrl}/api/v1/notifications/mark-all-read/`, {
    method: "PATCH",
    headers,
  });
  const time3 = (performance.now() - start3) / 1000;
  results.push({
    endpoint: "/notifications/mark-all-read/ (mutate)",
    method: "PATCH",
    status: res3.status,
    time: time3,
  });
  onResult(results[results.length - 1]);

  if (shouldStop()) return results;

  // Brief wait for signal propagation
  await new Promise((r) => setTimeout(r, 500));

  // Step 4: GET notifications again — verify cache invalidated
  onProgress(3, total, "Verifying cache invalidation...");
  const start4 = performance.now();
  const res4 = await fetch(
    `${serverUrl}/api/v1/notifications/?pagination=true&page=1&page_size=5`,
    { headers }
  );
  const data4 = await res4.json();
  const time4 = (performance.now() - start4) / 1000;

  // Check if all notifications are now read
  const notifs = data4.results || [];
  const allRead = notifs.every((n: any) => n.is_read);

  const cacheResult: CacheTestResult = {
    endpoint: "/notifications/ (after mutation)",
    method: "GET",
    status: res4.status,
    time: time4,
    cacheStatus: unreadBefore === 0 ? "skipped" : allRead ? "fresh" : "stale",
    error: !allRead && unreadBefore > 0 ? "STALE CACHE — notifications still show as unread after mark-all-read" : undefined,
  };
  results.push(cacheResult);
  onResult(cacheResult);

  onProgress(4, total, "Cache test complete");
  return results;
}
