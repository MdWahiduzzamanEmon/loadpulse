/**
 * Shared utilities for test runners.
 */

import type { RequestResult, TestConfig, StressLevel } from "../types.js";

/**
 * Build full URLs from config endpoints, distributing `count` requests
 * evenly across ALL selected endpoints (round-robin).
 */
export function buildUrls(config: TestConfig, count: number): string[] {
  const { serverUrl, endpoints } = config;
  const pageSize = config.pageSize ?? 10;

  const baseUrls = endpoints.map((ep) => {
    let url = `${serverUrl}${ep}`;
    if (config.paginationEnabled !== false && !url.includes("?")) {
      url += `?pagination=true&page=1&page_size=${pageSize}`;
    }
    return url;
  });

  if (baseUrls.length === 0) return [];

  // Round-robin distribute count requests across all endpoints
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    urls.push(baseUrls[i % baseUrls.length]);
  }
  return urls;
}

/**
 * Fire concurrent requests to a list of URLs and collect results.
 */
export async function fireBatch(
  urls: string[],
  token: string | null,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<RequestResult[]> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return Promise.all(
    urls.map(async (url) => {
      const start = performance.now();
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        signal?.addEventListener("abort", () => controller.abort(), { once: true });
        const res = await fetch(url, { method: "GET", headers, signal: controller.signal });
        clearTimeout(t);
        await res.text();
        return {
          endpoint: new URL(url).pathname,
          method: "GET",
          status: res.status,
          time: (performance.now() - start) / 1000,
        } as RequestResult;
      } catch (err: any) {
        return {
          endpoint: new URL(url).pathname,
          method: "GET",
          status: 0,
          time: (performance.now() - start) / 1000,
          error: err.name === "AbortError" ? "Aborted" : err.message,
        } as RequestResult;
      }
    })
  );
}

/**
 * Calculate stats for a batch of results.
 */
export function calcLevel(results: RequestResult[], concurrency: number): StressLevel {
  const times = results.map((r) => r.time).sort((a, b) => a - b);
  const ok = results.filter((r) => r.status >= 200 && r.status < 400).length;
  return {
    concurrency,
    total: results.length,
    success: ok,
    errors: results.length - ok,
    avgTime: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    p95Time: times.length ? times[Math.floor(times.length * 0.95)] : 0,
    maxTime: times.length ? times[times.length - 1] : 0,
  };
}
