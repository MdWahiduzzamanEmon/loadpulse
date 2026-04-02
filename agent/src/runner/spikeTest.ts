/**
 * Spike test — sudden traffic burst: low → high → low.
 * Distributes requests across ALL selected endpoints.
 */

import { getToken } from "../auth.js";
import type { RequestResult, TestConfig, StressLevel } from "../types.js";
import { buildUrls, fireBatch, calcLevel } from "./utils.js";

export async function runSpikeTest(
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

  const phases = [10, concurrency, 10, concurrency, 10];
  const labels = ["Warm-up (10)", `Spike (${concurrency})`, "Recovery (10)", `Spike 2 (${concurrency})`, "Cool-down (10)"];
  const levels: StressLevel[] = [];

  for (let i = 0; i < phases.length; i++) {
    if (shouldStop()) break;
    onProgress(i, phases.length, `${labels[i]} across ${config.endpoints.length} endpoints`);

    if (credentials && i > 0) {
      try { token = await getToken(serverUrl, credentials); } catch {}
    }

    const urls = buildUrls(config, phases[i]);
    const results = await fireBatch(urls, token, timeoutMs, signal);
    results.forEach(onResult);

    const level = calcLevel(results, phases[i]);
    levels.push(level);
    onLevel(level);

    await new Promise((r) => setTimeout(r, 1500));
  }

  return levels;
}
