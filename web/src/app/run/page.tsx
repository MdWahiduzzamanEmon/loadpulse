"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resetRun, setStatus, saveToHistory } from "@/store/Features/states/testRunSlice";
import { sendToAgent } from "@/lib/ws";
import type { TestConfig } from "@/lib/types";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

// Small components — each handles one section of the page
import LiveCounter from "@/components/LiveCounter";
import TestConfigPanel, { type TestType } from "@/components/run/TestConfigPanel";
import ErrorBreakdown from "@/components/run/ErrorBreakdown";
import ResponseChart from "@/components/run/ResponseChart";
import ResultsList from "@/components/run/ResultsList";
import EndpointResultsTable from "@/components/run/EndpointResultsTable";
import TestSummaryCard from "@/components/run/TestSummaryCard";

export default function RunPage() {
  const dispatch = useAppDispatch();
  const { server, agentConnected, selectedEndpoints } = useAppSelector((s) => s.connection);
  const { status, results, summary, progress, stressLevels, logs } = useAppSelector((s) => s.testRun);

  const [testType, setTestType] = useState<TestType>("load");
  const [concurrency, setConcurrency] = useState(100);
  const [timeout, setTimeout_] = useState(30);
  const [pageSize, setPageSize] = useState(10);
  const [lastConfig, setLastConfig] = useState<TestConfig | null>(null);

  // Computed stats
  const successCount = useMemo(() => results.filter((r) => r.status >= 200 && r.status < 400).length, [results]);
  const serverErrors = useMemo(() => results.filter((r) => r.status >= 500 || r.status === 0).length, [results]);
  const rateLimited = useMemo(() => results.filter((r) => r.status === 429).length, [results]);
  const avgTime = useMemo(() => (results.length === 0 ? 0 : results.reduce((a, r) => a + r.time, 0) / results.length), [results]);

  const isRunning = status === "running";
  const isDone = status === "done" || status === "stopped" || status === "error";
  const progressPct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  // Save to history when test completes
  useEffect(() => {
    if ((status === "done" || status === "stopped") && summary && lastConfig) {
      dispatch(saveToHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        config: lastConfig,
        results: results.slice(0, 500),
        summary,
        status,
      }));
    }
  }, [status, summary]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = useCallback(() => {
    if (!server || selectedEndpoints.length === 0) return;
    dispatch(resetRun());
    dispatch(setStatus("running"));

    const config: TestConfig = {
      testType,
      endpoints: selectedEndpoints,
      concurrency,
      serverUrl: server.url,
      credentials: server.username ? { username: server.username, password: server.password } : undefined,
      timeout,
      pageSize,
      paginationEnabled: true,
    };
    setLastConfig(config);
    sendToAgent({ type: "run", config });
  }, [server, selectedEndpoints, testType, concurrency, timeout, pageSize, dispatch]);

  const handleStop = useCallback(() => {
    sendToAgent({ type: "stop" });
    dispatch(setStatus("stopped"));
  }, [dispatch]);

  // Empty states
  if (!agentConnected) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Run Tests</h1>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Agent not connected.</p>
            <Link href="/" className="text-primary underline mt-2 inline-block">Go to Connect page</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedEndpoints.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Run Tests</h1>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No endpoints selected.</p>
            <Link href="/endpoints" className="text-primary underline mt-2 inline-block">Select endpoints first</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Run Tests</h1>
        <p className="text-muted-foreground mt-1">
          {selectedEndpoints.length} endpoints selected &middot; Server: <span className="text-foreground">{server?.url}</span>
        </p>
      </motion.div>

      {/* Config */}
      <TestConfigPanel
        testType={testType}
        setTestType={setTestType}
        concurrency={concurrency}
        setConcurrency={setConcurrency}
        timeout={timeout}
        setTimeout={setTimeout_}
        pageSize={pageSize}
        setPageSize={setPageSize}
        isRunning={isRunning}
        isDone={isDone}
        hasResults={results.length > 0}
        onRun={handleRun}
        onStop={handleStop}
        onClear={() => dispatch(resetRun())}
      />

      {/* Progress */}
      {(isRunning || isDone) && progress.total > 0 && (
        <motion.div initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} className="origin-top">
          <Progress value={progressPct} className="h-2" />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>
              {isRunning && <Loader2 className="inline w-3 h-3 mr-1 animate-spin" />}
              {progress.phase || (isRunning ? "Running..." : "Complete")}
            </span>
            <span>{progress.completed} / {progress.total}</span>
          </div>
        </motion.div>
      )}

      {/* Live counters */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card><CardContent className="pt-5 pb-4"><LiveCounter value={results.length} label="Total Requests" /></CardContent></Card>
          <Card><CardContent className="pt-5 pb-4"><LiveCounter value={successCount} label="Success (2xx/3xx)" color="text-emerald-500" /></CardContent></Card>
          <Card><CardContent className="pt-5 pb-4"><LiveCounter value={serverErrors} label="Server Errors (5xx)" color={serverErrors > 0 ? "text-red-500" : "text-muted-foreground"} /></CardContent></Card>
          <Card><CardContent className="pt-5 pb-4"><LiveCounter value={rateLimited} label="Rate Limited (429)" color={rateLimited > 0 ? "text-blue-400" : "text-muted-foreground"} /></CardContent></Card>
          <Card><CardContent className="pt-5 pb-4"><LiveCounter value={avgTime} label="Avg Response" suffix="s" decimals={3} /></CardContent></Card>
        </motion.div>
      )}

      {/* Summary — show at top when done */}
      {summary && isDone && <TestSummaryCard summary={summary} />}

      {/* Error breakdown */}
      <ErrorBreakdown results={results} />

      {/* Per-endpoint aggregated results table */}
      <EndpointResultsTable results={results} />

      {/* Chart */}
      <ResponseChart results={results} testType={testType} stressLevels={stressLevels} />

      {/* Raw request log */}
      <ResultsList results={results} />

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Agent Logs</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-[150px] overflow-y-auto font-mono text-xs text-muted-foreground space-y-0.5">
              {logs.map((log, i) => (
                <div key={i} className={log.startsWith("Error") ? "text-red-400" : ""}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
