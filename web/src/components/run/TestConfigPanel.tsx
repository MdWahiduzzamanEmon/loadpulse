"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Play,
  Square,
  Zap,
  TrendingUp,
  CheckCircle,
  RefreshCw,
  Flame,
  Timer,
  Shield,
} from "lucide-react";

export type TestType = "load" | "stress" | "functional" | "cache" | "spike" | "soak" | "auth";

const TEST_TYPES: { value: TestType; label: string; icon: typeof Zap; description: string }[] = [
  {
    value: "load",
    label: "Load Test",
    icon: Zap,
    description: "Fire N concurrent requests. Measures throughput, error rate, and response times under sustained load.",
  },
  {
    value: "stress",
    label: "Stress Test",
    icon: TrendingUp,
    description: "Auto-increase concurrency (50 → 100 → 200 → 500) until the server breaks. Finds the breaking point.",
  },
  {
    value: "spike",
    label: "Spike Test",
    icon: Flame,
    description: "Sudden traffic burst: 10 → N → 10. Tests how the server handles and recovers from sudden load spikes.",
  },
  {
    value: "soak",
    label: "Soak Test",
    icon: Timer,
    description: "Sustained load over time (minutes). Detects memory leaks, connection exhaustion, and gradual degradation.",
  },
  {
    value: "functional",
    label: "Functional",
    icon: CheckCircle,
    description: "Single request per endpoint. Validates status code, JSON response, and that the endpoint is reachable.",
  },
  {
    value: "cache",
    label: "Cache Check",
    icon: RefreshCw,
    description: "GET → mutate → GET. Verifies cache invalidation works — no stale data served after writes.",
  },
  {
    value: "auth",
    label: "Auth Test",
    icon: Shield,
    description: "Tests authentication boundaries: expired tokens, wrong roles, unauthenticated access to protected endpoints.",
  },
];

const CONCURRENCY_PRESETS = [10, 25, 50, 100, 200, 300, 500];

interface TestConfigPanelProps {
  testType: TestType;
  setTestType: (t: TestType) => void;
  concurrency: number;
  setConcurrency: (n: number) => void;
  timeout: number;
  setTimeout: (n: number) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  isRunning: boolean;
  isDone: boolean;
  hasResults: boolean;
  onRun: () => void;
  onStop: () => void;
  onClear: () => void;
}

export default function TestConfigPanel({
  testType,
  setTestType,
  concurrency,
  setConcurrency,
  timeout,
  setTimeout,
  pageSize,
  setPageSize,
  isRunning,
  isDone,
  hasResults,
  onRun,
  onStop,
  onClear,
}: TestConfigPanelProps) {
  const [customConcurrency, setCustomConcurrency] = useState("");
  const showConcurrency = ["load", "stress", "spike", "soak"].includes(testType);

  const currentTest = TEST_TYPES.find((t) => t.value === testType)!;

  const handleCustomConcurrency = () => {
    const val = parseInt(customConcurrency);
    if (val > 0 && val <= 10000) {
      setConcurrency(val);
      setCustomConcurrency("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Test Type Grid */}
          <div>
            <Label className="mb-3 block">Test Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {TEST_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTestType(value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                    testType === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {currentTest.description}
            </p>
          </div>

          {/* Concurrency Presets + Custom */}
          {showConcurrency && (
            <div>
              <Label className="mb-2 block">
                Concurrency: <strong className="text-primary">{concurrency}</strong>
              </Label>
              <div className="flex flex-wrap gap-2">
                {CONCURRENCY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setConcurrency(preset)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                      concurrency === preset
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                {/* Custom input */}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    placeholder="Custom"
                    value={customConcurrency}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomConcurrency(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleCustomConcurrency()}
                    className="w-24 h-8 text-sm"
                    min={1}
                    max={10000}
                  />
                  {customConcurrency && (
                    <Button size="sm" variant="outline" className="h-8" onClick={handleCustomConcurrency}>
                      Set
                    </Button>
                  )}
                </div>
              </div>
              {!CONCURRENCY_PRESETS.includes(concurrency) && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Custom: {concurrency}
                </Badge>
              )}
            </div>
          )}

          {/* Other Config */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Request Timeout (sec)</Label>
              <Input
                type="number"
                value={timeout}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeout(Number(e.target.value))}
                min={5}
                max={120}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Page Size (pagination)</Label>
              <Input
                type="number"
                value={pageSize}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPageSize(Number(e.target.value))}
                min={1}
                max={100}
                className="mt-1"
              />
            </div>
          </div>

          {/* Run / Stop */}
          <div className="flex gap-3 pt-2">
            {!isRunning ? (
              <Button size="lg" onClick={onRun} className="gap-2 px-8">
                <Play className="w-5 h-5" />
                Run {currentTest.label}
              </Button>
            ) : (
              <Button size="lg" variant="destructive" onClick={onStop} className="gap-2 px-8">
                <Square className="w-5 h-5" />
                Stop
              </Button>
            )}
            {isDone && hasResults && (
              <Button variant="outline" size="lg" onClick={onClear}>
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
