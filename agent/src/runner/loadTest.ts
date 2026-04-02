/**
 * Load test runner — fires N concurrent requests to each endpoint
 * and streams results back via a callback.
 * All config values come from the UI — nothing hardcoded.
 */

import { getToken } from "../auth.js";
import type { RequestResult, TestConfig } from "../types.js";

async function makeRequest(
  url: string,
  method: string,
  token: string | null,
  timeoutMs: number,
  parentSignal?: AbortSignal
): Promise<RequestResult> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const start = performance.now();
  try {
    // Abort on either per-request timeout OR global stop signal
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    parentSignal?.addEventListener("abort", () => controller.abort(), { once: true });

    const res = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const elapsed = (performance.now() - start) / 1000;
    const body = await res.text();

    return {
      endpoint: new URL(url).pathname,
      method,
      status: res.status,
      time: elapsed,
      size: body.length,
      error: res.status >= 400 ? body.slice(0, 200) : undefined,
    };
  } catch (err: any) {
    const elapsed = (performance.now() - start) / 1000;
    return {
      endpoint: new URL(url).pathname,
      method,
      status: 0,
      time: elapsed,
      error: err.name === "AbortError" ? `Timeout (${timeoutMs / 1000}s)` : err.message,
    };
  }
}

function buildUrl(serverUrl: string, endpoint: string, config: TestConfig): string {
  let url = `${serverUrl}${endpoint}`;
  // Add pagination params if enabled and no query string exists
  if (config.paginationEnabled !== false && !url.includes("?")) {
    const pageSize = config.pageSize ?? 10;
    url += `?pagination=true&page=1&page_size=${pageSize}`;
  }
  return url;
}

export async function runLoadTest(
  config: TestConfig,
  onResult: (result: RequestResult) => void,
  onProgress: (completed: number, total: number) => void,
  shouldStop: () => boolean,
  signal?: AbortSignal
): Promise<RequestResult[]> {
  const { serverUrl, endpoints, concurrency, credentials } = config;
  const timeoutMs = (config.timeout ?? 30) * 1000;

  // Get auth token if credentials provided
  let token: string | null = null;
  if (credentials) {
    token = await getToken(serverUrl, credentials);
  }

  const urls = endpoints.map((ep) => ({
    url: buildUrl(serverUrl, ep, config),
    method: "GET",
  }));

  const total = urls.length * concurrency;
  let completed = 0;
  const allResults: RequestResult[] = [];

  for (const { url, method } of urls) {
    if (shouldStop()) break;

    // Refresh token periodically for long tests
    if (credentials && completed > 0 && completed % 500 === 0) {
      try { token = await getToken(serverUrl, credentials); } catch {}
    }

    const batch = Array.from({ length: concurrency }, () =>
      makeRequest(url, method, token, timeoutMs, signal)
    );

    const results = await Promise.all(batch);

    for (const result of results) {
      if (shouldStop()) break;
      allResults.push(result);
      completed++;
      onResult(result);
      onProgress(completed, total);
    }
  }

  return allResults;
}
