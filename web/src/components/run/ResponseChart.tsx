"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequestResult, StressLevel } from "@/lib/types";
import { Timer, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ResponseChartProps {
  results: RequestResult[];
  testType: string;
  stressLevels: StressLevel[];
}

export default function ResponseChart({ results, testType, stressLevels }: ResponseChartProps) {
  // Sample data points to avoid overwhelming the chart
  const chartData = useMemo(() => {
    const data = results.length > 500
      ? results.filter((_, i) => i % Math.ceil(results.length / 300) === 0)
      : results;
    return data.map((r, i) => ({
      index: i,
      time: Math.round(r.time * 1000) / 1000,
    }));
  }, [results]);

  const stressChartData = useMemo(
    () =>
      stressLevels.map((l) => ({
        concurrency: l.concurrency,
        avgTime: Math.round(l.avgTime * 1000) / 1000,
        p95Time: Math.round(l.p95Time * 1000) / 1000,
        errorRate: Math.round((l.errors / l.total) * 1000) / 10,
      })),
    [stressLevels]
  );

  // Stress chart
  if (testType === "stress" && stressChartData.length > 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Stress Curve
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stressChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.5} />
                <XAxis dataKey="concurrency" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `${v}s`} width={50} />
                <YAxis yAxisId="error" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `${v}%`} width={50} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line yAxisId="time" type="monotone" dataKey="avgTime" stroke="#3b82f6" strokeWidth={2} name="Avg Time (s)" />
                <Line yAxisId="time" type="monotone" dataKey="p95Time" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="P95 Time (s)" />
                <Line yAxisId="error" type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} name="Error Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Response time chart
  if (chartData.length <= 3) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Response Times ({chartData.length} data points)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.5} />
              <XAxis dataKey="index" tick={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `${v}s`} width={50} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v)}s`, "Response Time"]}
                labelFormatter={(l) => `Request #${Number(l) + 1}`}
              />
              <Line type="monotone" dataKey="time" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
