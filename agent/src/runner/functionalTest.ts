/**
 * Functional test — single request per endpoint, validates response.
 * Checks: status 2xx, valid JSON, non-empty response.
 */

import { getToken } from "../auth.js";
import type { RequestResult, TestConfig } from "../types.js";

export async function runFunctionalTest(
  config: TestConfig,
  onResult: (result: RequestResult) => void,
  onProgress: (completed: number, total: number) => void,
  shouldStop: () => boolean,
  signal?: AbortSignal
): Promise<RequestResult[]> {
  const { serverUrl, endpoints, credentials } = config;

  let token: string | null = null;
  if (credentials) token = await getToken(serverUrl, credentials);

  const results: RequestResult[] = [];

  for (let i = 0; i < endpoints.length; i++) {
    if (shouldStop()) break;

    const ep = endpoints[i];
    let url = `${serverUrl}${ep}`;
    if (!url.includes("?")) url += "?pagination=true&page=1&page_size=5";

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      signal?.addEventListener("abort", () => controller.abort(), { once: true });
      const res = await fetch(url, { method: "GET", headers, signal: controller.signal });
      clearTimeout(timeout);
      const elapsed = (performance.now() - start) / 1000;
      const body = await res.text();

      // Validate response
      let error: string | undefined;
      if (res.status >= 500) {
        error = `Server error: ${res.status}`;
      } else if (res.status >= 400) {
        error = `Client error: ${res.status}`;
      } else {
        try {
          JSON.parse(body);
        } catch {
          error = "Response is not valid JSON";
        }
      }

      const result: RequestResult = {
        endpoint: ep,
        method: "GET",
        status: res.status,
        time: elapsed,
        size: body.length,
        error,
      };
      results.push(result);
      onResult(result);
    } catch (err: any) {
      const elapsed = (performance.now() - start) / 1000;
      const result: RequestResult = {
        endpoint: ep,
        method: "GET",
        status: 0,
        time: elapsed,
        error: err.name === "AbortError" ? "Timeout" : err.message,
      };
      results.push(result);
      onResult(result);
    }

    onProgress(i + 1, endpoints.length);
  }

  return results;
}
