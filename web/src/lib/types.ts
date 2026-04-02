// Shared types — mirrors agent/src/types.ts

export interface Endpoint {
  method: string;
  path: string;
  group: string;
  description: string;
  requiresAuth: boolean;
  parameters: string[];
}

export interface RequestResult {
  endpoint: string;
  method: string;
  status: number;
  time: number;
  error?: string;
  size?: number;
  cacheStatus?: "fresh" | "stale" | "skipped";
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
  duration: number;
  stressLevels?: StressLevel[];
  breakingPoint?: number;
}

export interface TestConfig {
  testType: "load" | "stress" | "functional" | "cache" | "spike" | "soak" | "auth";
  endpoints: string[];
  concurrency: number;
  credentials?: { username: string; password: string };
  serverUrl: string;
  timeout?: number;
  pageSize?: number;
  paginationEnabled?: boolean;
  stressLevels?: number[];
  stressErrorThreshold?: number;
}

export type TestStatus = "idle" | "connecting" | "running" | "done" | "error" | "stopped";

export interface ServerConnection {
  url: string;
  username: string;
  password: string;
  agentUrl: string;
}

export interface TestRun {
  id: string;
  timestamp: number;
  config: TestConfig;
  results: RequestResult[];
  summary: TestSummary | null;
  status: TestStatus;
}
