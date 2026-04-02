"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TestSummary } from "@/lib/types";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface TestSummaryCardProps {
  summary: TestSummary;
}

export default function TestSummaryCard({ summary }: TestSummaryCardProps) {
  const errorRate = summary.errorCount / summary.totalRequests;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring" }}
    >
      <Card
        className={`border-2 ${
          errorRate === 0
            ? "border-emerald-500/30"
            : errorRate < 0.1
              ? "border-amber-500/30"
              : "border-red-500/30"
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {errorRate === 0 ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            ) : errorRate < 0.1 ? (
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <h3 className="font-bold text-lg">
                {errorRate === 0
                  ? "All Passed"
                  : `${summary.errorCount} Errors (${(errorRate * 100).toFixed(1)}%)`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {summary.totalRequests} requests in {summary.duration.toFixed(1)}s
                &middot; {summary.successCount} success
                &middot; avg {summary.avgTime.toFixed(3)}s
                &middot; p95 {summary.p95Time.toFixed(3)}s
                &middot; max {summary.maxTime.toFixed(3)}s
              </p>
            </div>
            {summary.breakingPoint && (
              <Badge variant="destructive" className="ml-auto">
                Breaking point: {summary.breakingPoint} concurrent
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
