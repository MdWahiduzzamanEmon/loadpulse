"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import type { RequestResult } from "@/lib/types";

interface ResultsListProps {
  results: RequestResult[];
}

export default function ResultsList({ results }: ResultsListProps) {
  if (results.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Results (latest 100 of {results.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {results.slice(-100).reverse().map((r, i) => (
            <div
              key={`${r.endpoint}-${i}-${r.time}`}
              className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 text-sm"
            >
              <StatusBadge status={r.status} />
              <code className="font-mono text-xs flex-1 truncate">{r.endpoint}</code>
              {r.error && (
                <span className="text-xs text-red-400 truncate max-w-[200px]">
                  {r.error.slice(0, 60)}
                </span>
              )}
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {r.time.toFixed(3)}s
              </span>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all ${
                    r.time < 1 ? "bg-emerald-500" : r.time < 3 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min((r.time / 5) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
