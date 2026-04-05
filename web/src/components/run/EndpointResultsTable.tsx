"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RequestResult } from "@/lib/types";
import { ChevronDown, BarChart3 } from "lucide-react";

interface EndpointStats {
  endpoint: string;
  total: number;
  success: number;
  errors: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  successRate: number;
  errorCodes: Record<number, number>;
}

function aggregateByEndpoint(results: RequestResult[]): EndpointStats[] {
  const map = new Map<string, RequestResult[]>();
  for (const r of results) {
    const key = r.endpoint;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const stats: EndpointStats[] = [];
  for (const [endpoint, reqs] of map) {
    const times = reqs.map((r) => r.time).sort((a, b) => a - b);
    const success = reqs.filter((r) => r.status >= 200 && r.status < 400).length;
    const errorCodes: Record<number, number> = {};
    for (const r of reqs) {
      if (r.status >= 400 || r.status === 0) {
        errorCodes[r.status] = (errorCodes[r.status] || 0) + 1;
      }
    }
    stats.push({
      endpoint, total: reqs.length, success, errors: reqs.length - success,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: times[0], maxTime: times[times.length - 1],
      p95Time: times[Math.floor(times.length * 0.95)] || times[times.length - 1],
      successRate: (success / reqs.length) * 100, errorCodes,
    });
  }
  return stats.sort((a, b) => b.total - a.total);
}

function statusColor(rate: number): string {
  if (rate >= 95) return "text-emerald-500";
  if (rate >= 80) return "text-amber-500";
  return "text-red-500";
}

function timeColor(time: number): string {
  if (time < 0.5) return "text-emerald-500";
  if (time < 1) return "text-emerald-400";
  if (time < 2) return "text-amber-500";
  return "text-red-500";
}

interface EndpointResultsTableProps {
  results: RequestResult[];
}

export default function EndpointResultsTable({ results }: EndpointResultsTableProps) {
  const stats = useMemo(() => aggregateByEndpoint(results), [results]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (stats.length === 0) return null;

  const toggle = (ep: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ep)) next.delete(ep);
      else next.add(ep);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Per-Endpoint Results ({stats.length} endpoints, {results.length} total)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {/* Desktop: scrollable table */}
        <div className="hidden sm:block overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_50px_50px_60px_65px_65px_65px_65px] gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b">
              <span>Endpoint</span>
              <span className="text-right">Total</span>
              <span className="text-right">OK</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Avg</span>
              <span className="text-right">P95</span>
              <span className="text-right">Min</span>
              <span className="text-right">Max</span>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {stats.map((s, i) => (
                <motion.div key={s.endpoint} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <div
                    className="grid grid-cols-[1fr_50px_50px_60px_65px_65px_65px_65px] gap-1.5 px-2 py-2 text-sm hover:bg-muted/50 rounded cursor-pointer items-center border-b border-border/30"
                    onClick={() => toggle(s.endpoint)}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      {s.errors > 0 ? (
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${expanded.has(s.endpoint) ? "" : "-rotate-90"}`} />
                      ) : (
                        <span className="w-3" />
                      )}
                      <code className="font-mono text-xs truncate">{s.endpoint}</code>
                    </div>
                    <span className="text-right tabular-nums font-medium text-xs">{s.total}</span>
                    <span className="text-right tabular-nums text-emerald-500 text-xs">{s.success}</span>
                    <span className={`text-right tabular-nums font-semibold text-xs ${statusColor(s.successRate)}`}>{s.successRate.toFixed(0)}%</span>
                    <span className={`text-right tabular-nums text-xs ${timeColor(s.avgTime)}`}>{s.avgTime.toFixed(3)}s</span>
                    <span className={`text-right tabular-nums text-xs ${timeColor(s.p95Time)}`}>{s.p95Time.toFixed(3)}s</span>
                    <span className="text-right tabular-nums text-xs text-muted-foreground">{s.minTime.toFixed(3)}s</span>
                    <span className={`text-right tabular-nums text-xs ${timeColor(s.maxTime)}`}>{s.maxTime.toFixed(3)}s</span>
                  </div>
                  {expanded.has(s.endpoint) && s.errors > 0 && (
                    <div className="px-8 py-2 bg-muted/30 text-xs space-y-1">
                      <span className="font-semibold text-muted-foreground">Errors ({s.errors}):</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(s.errorCodes).map(([code, count]) => (
                          <Badge key={code} variant="outline" className="text-xs">
                            {code === "0" ? "Timeout" : `HTTP ${code}`}: {count}x
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: card layout */}
        <div className="sm:hidden space-y-2 max-h-[500px] overflow-y-auto">
          {stats.map((s, i) => (
            <motion.div
              key={s.endpoint}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="p-3 rounded-lg border border-border/50 space-y-2"
              onClick={() => toggle(s.endpoint)}
            >
              <code className="font-mono text-xs block truncate">{s.endpoint}</code>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xs font-bold tabular-nums">{s.total}</div>
                  <div className="text-[10px] text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className={`text-xs font-bold tabular-nums ${statusColor(s.successRate)}`}>{s.successRate.toFixed(0)}%</div>
                  <div className="text-[10px] text-muted-foreground">Rate</div>
                </div>
                <div>
                  <div className={`text-xs font-bold tabular-nums ${timeColor(s.avgTime)}`}>{s.avgTime.toFixed(2)}s</div>
                  <div className="text-[10px] text-muted-foreground">Avg</div>
                </div>
                <div>
                  <div className={`text-xs font-bold tabular-nums ${timeColor(s.p95Time)}`}>{s.p95Time.toFixed(2)}s</div>
                  <div className="text-[10px] text-muted-foreground">P95</div>
                </div>
              </div>
              {expanded.has(s.endpoint) && s.errors > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {Object.entries(s.errorCodes).map(([code, count]) => (
                    <Badge key={code} variant="outline" className="text-[10px]">
                      {code === "0" ? "T/O" : code}: {count}x
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
