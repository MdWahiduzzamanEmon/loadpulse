/**
 * LoadPulse Agent — WebSocket server that executes tests and streams results.
 *
 * Start: npx tsx src/index.ts
 * Connects to dashboard via WebSocket on port 3050.
 */

import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { discoverEndpoints } from "./discovery.js";
import { runLoadTest } from "./runner/loadTest.js";
import { runStressTest } from "./runner/stressTest.js";
import { runFunctionalTest } from "./runner/functionalTest.js";
import { runCacheTest } from "./runner/cacheTest.js";
import { runSpikeTest } from "./runner/spikeTest.js";
import { runSoakTest } from "./runner/soakTest.js";
import { runAuthTest } from "./runner/authTest.js";
import { clearToken } from "./auth.js";
import type { ClientMessage, AgentMessage, TestSummary, RequestResult } from "./types.js";

const PORT = parseInt(process.env.AGENT_PORT || "3050");

// ── HTTP server for health check ──
const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", clients: wss.clients.size }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("LoadPulse Agent");
});

// ── WebSocket server ──
const wss = new WebSocketServer({ server, path: "/ws" });

let stopFlag = false;
// AbortController to kill ALL in-flight HTTP requests instantly on stop
let abortController: AbortController | null = null;

function send(ws: WebSocket, msg: AgentMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function buildSummary(results: RequestResult[], testType: string, startTime: number): TestSummary {
  const times = results.map((r) => r.time).sort((a, b) => a - b);
  const success = results.filter((r) => r.status >= 200 && r.status < 400).length;
  return {
    testType,
    totalRequests: results.length,
    successCount: success,
    errorCount: results.length - success,
    avgTime: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    p95Time: times.length ? times[Math.floor(times.length * 0.95)] : 0,
    maxTime: times.length ? times[times.length - 1] : 0,
    minTime: times.length ? times[0] : 0,
    duration: (performance.now() - startTime) / 1000,
  };
}

wss.on("connection", (ws) => {
  console.log("[agent] Dashboard connected");

  ws.on("message", async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    // ── Discover endpoints ──
    if (msg.type === "discover") {
      send(ws, { type: "log", message: `Discovering endpoints from ${msg.serverUrl}...` });
      try {
        let discoveryToken: string | undefined;
        if (msg.credentials) {
          const { getToken } = await import("./auth.js");
          discoveryToken = await getToken(msg.serverUrl, msg.credentials);
        }
        const endpoints = await discoverEndpoints(
          msg.serverUrl,
          discoveryToken,
          (progressMsg) => send(ws, { type: "log", message: progressMsg })
        );
        send(ws, { type: "endpoints", data: endpoints });
        send(ws, { type: "log", message: `Found ${endpoints.length} endpoints` });
      } catch (err: any) {
        send(ws, { type: "error", message: `Discovery failed: ${err.message}` });
      }
      return;
    }

    // ── Stop running test ──
    if (msg.type === "stop") {
      stopFlag = true;
      // Abort ALL in-flight HTTP requests immediately
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      send(ws, { type: "log", message: "Test stopped" });
      send(ws, { type: "done" });
      return;
    }

    // ── Run test ──
    if (msg.type === "run") {
      const { config } = msg;
      stopFlag = false;
      abortController = new AbortController();
      clearToken();
      const startTime = performance.now();

      send(ws, { type: "log", message: `Starting ${config.testType} test...` });

      try {
        const onResult = (r: RequestResult) => {
          if (!stopFlag) send(ws, { type: "result", data: r });
        };
        const onProgress = (c: number, t: number, phase?: string) => {
          if (!stopFlag) send(ws, { type: "progress", completed: c, total: t, phase });
        };
        const shouldStop = () => stopFlag;
        const signal = abortController.signal;

        let results: RequestResult[];

        switch (config.testType) {
          case "load":
            results = await runLoadTest(config, onResult, onProgress, shouldStop, signal);
            if (!stopFlag) send(ws, { type: "summary", data: buildSummary(results, "load", startTime) });
            break;

          case "stress":
            const levels = await runStressTest(
              config,
              (level) => { if (!stopFlag) send(ws, { type: "stress-level", data: level }); },
              onResult,
              onProgress,
              shouldStop,
              signal
            );
            const allResults = levels.flatMap((l) =>
              Array.from({ length: l.total }, (_, i) => ({
                endpoint: config.endpoints[0] || "/",
                method: "GET",
                status: i < l.success ? 200 : 500,
                time: l.avgTime,
              }))
            );
            const summary = buildSummary(allResults, "stress", startTime);
            summary.stressLevels = levels;
            summary.breakingPoint = levels.find((l) => l.errors / l.total > 0.5)?.concurrency;
            if (!stopFlag) send(ws, { type: "summary", data: summary });
            break;

          case "functional":
            results = await runFunctionalTest(config, onResult, onProgress, shouldStop, signal);
            if (!stopFlag) send(ws, { type: "summary", data: buildSummary(results, "functional", startTime) });
            break;

          case "cache":
            results = await runCacheTest(config, onResult, onProgress, shouldStop);
            if (!stopFlag) send(ws, { type: "summary", data: buildSummary(results, "cache", startTime) });
            break;

          case "spike": {
            const spikeLevels = await runSpikeTest(
              config,
              (level) => { if (!stopFlag) send(ws, { type: "stress-level", data: level }); },
              onResult, onProgress, shouldStop, signal
            );
            const spikeSummary = buildSummary(
              spikeLevels.flatMap((l) => Array.from({ length: l.total }, (_, i) => ({
                endpoint: config.endpoints[0] || "/", method: "GET",
                status: i < l.success ? 200 : 500, time: l.avgTime,
              }))),
              "spike", startTime
            );
            spikeSummary.stressLevels = spikeLevels;
            if (!stopFlag) send(ws, { type: "summary", data: spikeSummary });
            break;
          }

          case "soak": {
            const soakLevels = await runSoakTest(
              config,
              (level) => { if (!stopFlag) send(ws, { type: "stress-level", data: level }); },
              onResult, onProgress, shouldStop, signal
            );
            const soakSummary = buildSummary(
              soakLevels.flatMap((l) => Array.from({ length: l.total }, (_, i) => ({
                endpoint: config.endpoints[0] || "/", method: "GET",
                status: i < l.success ? 200 : 500, time: l.avgTime,
              }))),
              "soak", startTime
            );
            soakSummary.stressLevels = soakLevels;
            if (!stopFlag) send(ws, { type: "summary", data: soakSummary });
            break;
          }

          case "auth":
            results = await runAuthTest(config, onResult, onProgress, shouldStop, signal);
            if (!stopFlag) send(ws, { type: "summary", data: buildSummary(results, "auth", startTime) });
            break;
        }
      } catch (err: any) {
        if (!stopFlag) {
          send(ws, { type: "error", message: `Test failed: ${err.message}` });
        }
      }

      if (!stopFlag) send(ws, { type: "done" });
      abortController = null;
      return;
    }
  });

  ws.on("close", () => {
    console.log("[agent] Dashboard disconnected");
    stopFlag = true;
    abortController?.abort();
    abortController = null;
  });
});

server.listen(PORT, () => {
  console.log(`\n  ⚡ LoadPulse Agent running on port ${PORT}`);
  console.log(`  📡 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  ❤️  Health:    http://localhost:${PORT}/health\n`);
});
