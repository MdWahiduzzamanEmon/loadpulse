"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearHistory } from "@/store/Features/states/testRunSlice";
import { CheckCircle2, XCircle, Trash2, Clock } from "lucide-react";

export default function HistoryPage() {
  const dispatch = useAppDispatch();
  const { history } = useAppSelector((s) => s.testRun);

  if (history.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">History</h1>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No test runs yet. Run a test to see results here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">History</h1>
            <p className="text-muted-foreground mt-1">
              {history.length} past test runs
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(clearHistory())}
            className="gap-1 text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </Button>
        </div>
      </motion.div>

      <div className="space-y-3">
        {history.map((run, i) => {
          const s = run.summary;
          const passed = s ? s.errorCount === 0 : false;
          const date = new Date(run.timestamp);

          return (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-4">
                    {passed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {run.config.testType}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {date.toLocaleDateString()} {date.toLocaleTimeString()}
                        </span>
                      </div>
                      {s && (
                        <p className="text-sm mt-1">
                          {s.totalRequests} requests &middot;{" "}
                          <span className="text-emerald-500">
                            {s.successCount} ok
                          </span>{" "}
                          &middot;{" "}
                          <span className={s.errorCount > 0 ? "text-red-500" : ""}>
                            {s.errorCount} errors
                          </span>{" "}
                          &middot; avg {s.avgTime.toFixed(3)}s &middot; p95{" "}
                          {s.p95Time.toFixed(3)}s &middot;{" "}
                          {s.duration.toFixed(1)}s total
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {run.config.endpoints.length} endpoints &middot;{" "}
                        {run.config.concurrency} concurrent
                      </p>
                    </div>
                    {s?.breakingPoint && (
                      <Badge variant="destructive">
                        Break: {s.breakingPoint}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
