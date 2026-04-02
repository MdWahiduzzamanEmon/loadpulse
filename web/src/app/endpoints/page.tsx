"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  toggleEndpoint,
  selectAllEndpoints,
  deselectAllEndpoints,
  selectGroup,
  deselectGroup,
} from "@/store/Features/states/connectionSlice";
import { Search, CheckSquare, Square, ChevronRight } from "lucide-react";
import Link from "next/link";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-500",
  POST: "bg-blue-500/15 text-blue-500",
  PUT: "bg-amber-500/15 text-amber-500",
  PATCH: "bg-orange-500/15 text-orange-500",
  DELETE: "bg-red-500/15 text-red-500",
};

export default function EndpointsPage() {
  const dispatch = useAppDispatch();
  const { endpoints, selectedEndpoints } = useAppSelector((s) => s.connection);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group endpoints
  const groups = useMemo(() => {
    const map: Record<string, typeof endpoints> = {};
    for (const ep of endpoints) {
      const key = ep.group;
      if (!map[key]) map[key] = [];
      map[key].push(ep);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [endpoints]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map(([group, eps]) => [
        group,
        eps.filter(
          (ep) =>
            ep.path.toLowerCase().includes(q) ||
            ep.description.toLowerCase().includes(q) ||
            ep.group.toLowerCase().includes(q)
        ),
      ] as [string, typeof endpoints])
      .filter(([, eps]) => eps.length > 0);
  }, [groups, search]);

  const selectedSet = new Set(selectedEndpoints);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const isGroupSelected = (group: string, eps: typeof endpoints) => {
    const getEps = eps.filter((e) => e.method === "GET");
    return getEps.length > 0 && getEps.every((e) => selectedSet.has(e.path));
  };

  const isGroupPartial = (group: string, eps: typeof endpoints) => {
    const getEps = eps.filter((e) => e.method === "GET");
    const selected = getEps.filter((e) => selectedSet.has(e.path));
    return selected.length > 0 && selected.length < getEps.length;
  };

  if (endpoints.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Endpoints</h1>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>No endpoints discovered yet.</p>
            <Link href="/" className="text-primary underline mt-2 inline-block">
              Connect to a server first
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Endpoints</h1>
            <p className="text-muted-foreground mt-1">
              {endpoints.length} endpoints discovered &middot;{" "}
              {endpoints.filter((e) => e.method === "GET").length} testable (GET) &middot;{" "}
              {selectedEndpoints.length} selected
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(selectAllEndpoints())}
              className="gap-1"
            >
              <CheckSquare className="w-4 h-4" />
              Select All GET
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(deselectAllEndpoints())}
              className="gap-1"
            >
              <Square className="w-4 h-4" />
              Clear
            </Button>
            {selectedEndpoints.length > 0 && (
              <Link href="/run">
                <Button size="sm" className="gap-1">
                  Run Tests
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search endpoints..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Endpoint groups */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map(([group, eps], gi) => (
            <motion.div
              key={group}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.05 }}
            >
              <Card>
                <CardHeader
                  className="cursor-pointer py-3 px-4"
                  onClick={() => toggleGroup(group)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isGroupSelected(group, eps)}
                        onCheckedChange={(checked) => {
                          if (checked) dispatch(selectGroup(group));
                          else dispatch(deselectGroup(group));
                        }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                      <CardTitle className="text-base capitalize">
                        {group}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {eps.length}
                      </Badge>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        expandedGroups.has(group) ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {expandedGroups.has(group) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <Separator />
                      <CardContent className="py-2 px-4 space-y-0.5">
                        {eps.map((ep) => {
                          const isGet = ep.method === "GET";
                          return (
                          <div
                            key={`${ep.method}-${ep.path}`}
                            className={`flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors ${!isGet ? "opacity-50" : ""}`}
                          >
                            <Checkbox
                              checked={selectedSet.has(ep.path)}
                              onCheckedChange={() =>
                                dispatch(toggleEndpoint(ep.path))
                              }
                              disabled={!isGet}
                            />
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono px-1.5 py-0 ${
                                METHOD_COLORS[ep.method] || ""
                              }`}
                            >
                              {ep.method}
                            </Badge>
                            <code className="text-sm font-mono flex-1 truncate">
                              {ep.path}
                            </code>
                            {ep.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {ep.description}
                              </span>
                            )}
                            {!isGet && (
                              <span className="text-[10px] text-muted-foreground italic">
                                not testable via GET
                              </span>
                            )}
                          </div>
                          );
                        })}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
