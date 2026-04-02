/**
 * Auth test — tests authentication boundaries:
 * 1. Unauthenticated access to protected endpoints (should get 401)
 * 2. Access with valid credentials (should get 200)
 * 3. Access with invalid token (should get 401)
 */

import { getToken } from "../auth.js";
import type { RequestResult, TestConfig } from "../types.js";

async function makeRequest(
  url: string,
  token: string | null,
  label: string,
  signal?: AbortSignal
): Promise<RequestResult & { testCase: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const start = performance.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    signal?.addEventListener("abort", () => controller.abort(), { once: true });
    const res = await fetch(url, { method: "GET", headers, signal: controller.signal });
    clearTimeout(t);
    await res.text();
    return {
      endpoint: `[${label}] ${new URL(url).pathname}`,
      method: "GET",
      status: res.status,
      time: (performance.now() - start) / 1000,
      testCase: label,
    };
  } catch (err: any) {
    return {
      endpoint: `[${label}] ${new URL(url).pathname}`,
      method: "GET",
      status: 0,
      time: (performance.now() - start) / 1000,
      error: err.message,
      testCase: label,
    };
  }
}

export async function runAuthTest(
  config: TestConfig,
  onResult: (result: RequestResult) => void,
  onProgress: (completed: number, total: number, phase: string) => void,
  shouldStop: () => boolean,
  signal?: AbortSignal
): Promise<RequestResult[]> {
  const { serverUrl, endpoints, credentials } = config;
  const testEndpoints = endpoints.slice(0, 10); // Test up to 10 endpoints
  const results: RequestResult[] = [];
  const totalSteps = testEndpoints.length * 3; // 3 tests per endpoint
  let completed = 0;

  // Get valid token
  let validToken: string | null = null;
  if (credentials) {
    try {
      validToken = await getToken(serverUrl, credentials);
    } catch {}
  }

  for (const ep of testEndpoints) {
    if (shouldStop()) break;
    let url = `${serverUrl}${ep}`;
    if (!url.includes("?")) url += "?pagination=true&page=1&page_size=5";

    // Test 1: No auth (should get 401)
    onProgress(completed, totalSteps, `Testing ${ep} — no auth`);
    const noAuth = await makeRequest(url, null, "No Auth", signal);
    results.push(noAuth);
    onResult(noAuth);
    completed++;

    if (shouldStop()) break;

    // Test 2: Valid auth (should get 200)
    onProgress(completed, totalSteps, `Testing ${ep} — valid auth`);
    const withAuth = await makeRequest(url, validToken, "Valid Auth", signal);
    results.push(withAuth);
    onResult(withAuth);
    completed++;

    if (shouldStop()) break;

    // Test 3: Invalid token (should get 401)
    onProgress(completed, totalSteps, `Testing ${ep} — bad token`);
    const badAuth = await makeRequest(url, "invalid-token-12345", "Bad Token", signal);
    results.push(badAuth);
    onResult(badAuth);
    completed++;
  }

  return results;
}
