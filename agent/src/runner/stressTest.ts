/**
 * Stress test — increases concurrency until breaking point.
 * Distributes requests across ALL selected endpoints (round-robin).
 */

import { getToken } from "../auth.js";
import type { RequestResult, StressLevel, TestConfig } from "../types.js";
import { buildUrls, fireBatch, calcLevel } from "./utils.js";

const DEFAULT_LEVELS = [50, 100, 200, 300, 500];

export async function runStressTest(
  config: TestConfig,
  onLevel: (level: StressLevel) => void,
  onResult: (result: RequestResult) => void,
  onProgress: (completed: number, total: number, phase: string) => void,
  shouldStop: () => boolean,
  signal?: AbortSignal
): Promise<StressLevel[]> {
  const { serverUrl, credentials } = config;
  const levels = config.stressLevels ?? DEFAULT_LEVELS;
  const errorThreshold = config.stressErrorThreshold ?? 0.5;
  const timeoutMs = (config.timeout ?? 30) * 1000;

  let token: string | null = null;
  if (credentials) token = await getToken(serverUrl, credentials);

  const completedLevels: StressLevel[] = [];

  for (let i = 0; i < levels.length; i++) {
    if (shouldStop()) break;

    const conc = levels[i];
    onProgress(i, levels.length, `Testing ${conc} concurrent across ${config.endpoints.length} endpoints...`);

    if (credentials && i > 0) {
      try { token = await getToken(serverUrl, credentials); } catch {}
    }

    // Distribute concurrency across all endpoints
    const urls = buildUrls(config, conc);
    const results = await fireBatch(urls, token, timeoutMs, signal);
    results.forEach(onResult);

    const stats = calcLevel(results, conc);
    completedLevels.push(stats);
    onLevel(stats);

    if (stats.errors / stats.total > errorThreshold) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  return completedLevels;
}
