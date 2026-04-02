/**
 * Soak test — sustained load over time.
 * Distributes requests across ALL selected endpoints each round.
 * 10 rounds, 10 seconds apart (~2 minutes total).
 */

import { getToken } from "../auth.js";
import type { RequestResult, TestConfig, StressLevel } from "../types.js";
import { buildUrls, fireBatch, calcLevel } from "./utils.js";

export async function runSoakTest(
  config: TestConfig,
  onLevel: (level: StressLevel) => void,
  onResult: (result: RequestResult) => void,
  onProgress: (completed: number, total: number, phase: string) => void,
  shouldStop: () => boolean,
  signal?: AbortSignal
): Promise<StressLevel[]> {
  const { serverUrl, concurrency, credentials } = config;
  const timeoutMs = (config.timeout ?? 30) * 1000;

  let token: string | null = null;
  if (credentials) token = await getToken(serverUrl, credentials);

  const rounds = 10;
  const intervalMs = 10_000;
  const levels: StressLevel[] = [];

  for (let i = 0; i < rounds; i++) {
    if (shouldStop()) break;
    onProgress(i, rounds, `Round ${i + 1}/${rounds} — ${concurrency} concurrent across ${config.endpoints.length} endpoints`);

    if (credentials && i > 0 && i % 3 === 0) {
      try { token = await getToken(serverUrl, credentials); } catch {}
    }

    const urls = buildUrls(config, concurrency);
    const results = await fireBatch(urls, token, timeoutMs, signal);
    results.forEach(onResult);

    const level = calcLevel(results, concurrency);
    levels.push(level);
    onLevel(level);

    if (i < rounds - 1 && !shouldStop()) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  return levels;
}
