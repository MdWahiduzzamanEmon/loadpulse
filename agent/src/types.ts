// ── Shared types for agent ↔ dashboard communication ──

export interface Endpoint {
  method: string;
  path: string;
  group: string;
  description: string;
  requiresAuth: boolean;
  parameters: string[];
}

export interface TestConfig {
  testType: "load" | "stress" | "functional" | "cache" | "spike" | "soak" | "auth";
  endpoints: string[];       // paths like "/orders/"
  concurrency: number;
  credentials?: { username: string; password: string };
  serverUrl: string;
  // Configurable from UI
  timeout?: number;          // request timeout in seconds (default 30)
  pageSize?: number;         // pagination page_size param (default 10)
  paginationEnabled?: boolean; // add ?pagination=true (default true)
  stressLevels?: number[];   // custom stress levels (default [50,100,200,300,500])
  stressErrorThreshold?: number; // stop stress when error rate exceeds this (default 0.5)
}

export interface RequestResult {
  endpoint: string;
  method: string;
  status: number;
  time: number;              // seconds
  error?: string;
  size?: number;             // response bytes
}

export interface StressLevel {
  concurrency: number;
  total: number;
  success: number;
  errors: number;
  avgTime: number;
  p95Time: number;
  maxTime: number;
}

export interface TestSummary {
  testType: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgTime: number;
  p95Time: number;
  maxTime: number;
  minTime: number;
  duration: number;          // total test duration in seconds
  stressLevels?: StressLevel[];
  breakingPoint?: number;
}

// WebSocket messages: Dashboard → Agent
export type ClientMessage =
  | { type: "discover"; serverUrl: string; credentials?: { username: string; password: string } }
  | { type: "run"; config: TestConfig }
  | { type: "stop" };

// WebSocket messages: Agent → Dashboard
export type AgentMessage =
  | { type: "endpoints"; data: Endpoint[] }
  | { type: "progress"; completed: number; total: number; phase?: string }
  | { type: "result"; data: RequestResult }
  | { type: "stress-level"; data: StressLevel }
  | { type: "summary"; data: TestSummary }
  | { type: "error"; message: string }
  | { type: "done" }
  | { type: "log"; message: string };
