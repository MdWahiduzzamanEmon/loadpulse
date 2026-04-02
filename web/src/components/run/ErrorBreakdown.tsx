"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RequestResult } from "@/lib/types";
import {
  XCircle,
  ShieldAlert,
  ServerCrash,
  Clock,
  AlertCircle,
  AlertTriangle,
  Shield,
  Info,
} from "lucide-react";

function groupErrors(results: RequestResult[]) {
  const errors: Record<string, { count: number; sample: string }> = {};
  for (const r of results) {
    if (r.status >= 400 || r.status === 0) {
      const key = r.status === 0 ? "Timeout" : `${r.status}`;
      if (!errors[key]) errors[key] = { count: 0, sample: r.error || "" };
      errors[key].count++;
      if (!errors[key].sample && r.error) errors[key].sample = r.error;
    }
  }
  return Object.entries(errors).sort(([, a], [, b]) => b.count - a.count);
}

function getErrorMeta(code: string) {
  const c = parseInt(code);
  if (code === "Timeout") return { label: "Timeout", icon: Clock, color: "text-orange-500", severity: "error" as const };
  if (c === 401) return { label: "Unauthorized", icon: ShieldAlert, color: "text-yellow-500", severity: "error" as const };
  if (c === 403) return { label: "Forbidden (need admin)", icon: ShieldAlert, color: "text-amber-500", severity: "warn" as const };
  if (c === 404) return { label: "Not Found", icon: AlertCircle, color: "text-gray-400", severity: "warn" as const };
  if (c === 429) return { label: "Rate Limited (nginx protection)", icon: Shield, color: "text-blue-400", severity: "info" as const };
  if (c === 503) return { label: "Service Unavailable (overloaded)", icon: ServerCrash, color: "text-red-500", severity: "error" as const };
  if (c >= 500) return { label: "Server Error", icon: ServerCrash, color: "text-red-500", severity: "error" as const };
  return { label: `Error ${code}`, icon: XCircle, color: "text-red-400", severity: "error" as const };
}

interface ErrorBreakdownProps {
  results: RequestResult[];
}

export default function ErrorBreakdown({ results }: ErrorBreakdownProps) {
  const breakdown = useMemo(() => groupErrors(results), [results]);

  // Separate real errors from expected responses
  const realErrors = useMemo(
    () => results.filter((r) => (r.status >= 500 || r.status === 0)).length,
    [results]
  );
  const rateLimited = useMemo(
    () => results.filter((r) => r.status === 429).length,
    [results]
  );
  const authErrors = useMemo(
    () => results.filter((r) => r.status === 401 || r.status === 403).length,
    [results]
  );
  const totalNonSuccess = useMemo(
    () => results.filter((r) => r.status >= 400 || r.status === 0).length,
    [results]
  );

  if (breakdown.length === 0) return null;

  // Card border color based on severity
  const borderColor = realErrors > 0
    ? "border-red-500/20"
    : rateLimited > 0
      ? "border-blue-500/20"
      : "border-amber-500/20";

  const headerColor = realErrors > 0 ? "text-red-500" : "text-amber-500";
  const HeaderIcon = realErrors > 0 ? XCircle : AlertTriangle;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={borderColor}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm flex items-center gap-2 ${headerColor}`}>
            <HeaderIcon className="w-4 h-4" />
            Response Breakdown ({totalNonSuccess} non-2xx)
            {realErrors === 0 && rateLimited > 0 && (
              <Badge variant="secondary" className="text-xs ml-2 font-normal">
                No real errors — rate limiting only
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {breakdown.map(([code, { count, sample }]) => {
            const { label, icon: Icon, color, severity } = getErrorMeta(code);
            return (
              <motion.div
                key={code}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
              >
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {code === "Timeout" ? "Timeout" : `HTTP ${code}`}
                    </span>
                    <Badge
                      variant={severity === "info" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {label}
                    </Badge>
                    <span className="text-sm font-bold ml-auto">{count}x</span>
                  </div>
                  {/* Helpful explanation for common errors */}
                  {code === "429" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nginx rate limiting is protecting the server. This is expected when testing from a single IP.
                      To test raw capacity, run the agent on the server or increase the nginx burst limit.
                    </p>
                  )}
                  {code === "503" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Server temporarily overloaded. Nginx returned 503 because all backend workers were busy.
                    </p>
                  )}
                  {code === "403" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      These endpoints require admin privileges. Use admin credentials or deselect admin-only endpoints.
                    </p>
                  )}
                  {code === "401" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Authentication token expired or invalid. Check credentials on the Connect page.
                    </p>
                  )}
                  {sample && severity === "error" && (
                    <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                      {sample.slice(0, 150)}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
