"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setServer } from "@/store/Features/states/connectionSlice";
import { connectToAgent, disconnectAgent, sendToAgent } from "@/lib/ws";
import {
  Server,
  Key,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  List,
  Zap,
  AlertCircle,
} from "lucide-react";

export default function ConnectPage() {
  const dispatch = useAppDispatch();
  const { server, agentConnected, endpoints } = useAppSelector(
    (s) => s.connection
  );

  // Initialize from localStorage synchronously (no useEffect needed)
  const saved = typeof window !== "undefined" ? localStorage.getItem("loadpulse-connection") : null;
  const savedConn = saved ? (() => { try { return JSON.parse(saved); } catch { return null; } })() : null;

  const [serverUrl, setServerUrl] = useState(savedConn?.url || server?.url || "");
  const [agentUrl, setAgentUrl] = useState(savedConn?.agentUrl || server?.agentUrl || "");
  const [username, setUsername] = useState(savedConn?.username || server?.username || "");
  const [password, setPassword] = useState(savedConn?.password || server?.password || "");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  // True while waiting for agent + discovery, false once connected or failed
  const showSpinner = connecting && !agentConnected;

  const handleConnect = () => {
    // Validate inputs
    setError("");
    if (!serverUrl.trim()) { setError("Server URL is required."); return; }
    if (!serverUrl.startsWith("http")) { setError("Server URL must start with http:// or https://"); return; }
    if (!agentUrl.trim()) { setError("Agent URL is required."); return; }
    if (!agentUrl.startsWith("http")) { setError("Agent URL must start with http:// or https://"); return; }
    if (!username.trim()) { setError("Username is required to authenticate with the API server."); return; }
    if (!password.trim()) { setError("Password is required to authenticate with the API server."); return; }

    setConnecting(true);
    const conn = { url: serverUrl.replace(/\/+$/, ""), username, password, agentUrl: agentUrl.replace(/\/+$/, "") };
    dispatch(setServer(conn));
    localStorage.setItem("loadpulse-connection", JSON.stringify(conn));

    connectToAgent(
      conn.agentUrl,
      // onConnected — WebSocket open, now discover endpoints
      () => {
        sendToAgent({
          type: "discover",
          serverUrl: conn.url,
          credentials: { username, password },
        });
        // Timeout after 15s if neither success nor error arrives
        setTimeout(() => setConnecting(false), 15000);
      },
      // onError — could not reach agent WebSocket
      (msg) => {
        setError(msg);
        setConnecting(false);
      },
      // onDiscoveryError — agent reached but server URL or credentials wrong
      (msg) => {
        setError(`Discovery failed: ${msg}`);
        setConnecting(false);
      }
    );
  };

  const handleDisconnect = () => {
    disconnectAgent();
    dispatch(setServer(null));
    setError("");
  };

  const groups = endpoints.reduce(
    (acc, ep) => {
      acc[ep.group] = (acc[ep.group] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold">Connect to Server</h1>
        <p className="text-muted-foreground mt-1">
          Connect the LoadPulse agent to your API server and start testing.
        </p>
      </motion.div>

      {/* Setup Guide — shown when not connected */}
      {!agentConnected && endpoints.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p className="font-medium">Start the agent on your machine</p>
                  <code className="block mt-1 px-3 py-1.5 bg-muted rounded text-xs font-mono select-all">npx loadpulse-agent</code>
                  <p className="text-muted-foreground text-xs mt-1">Or with Docker: <code className="bg-muted px-1 rounded">docker run -p 3050:3050 emon424096/loadpulse-agent</code></p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p className="font-medium">Enter your API server URL below</p>
                  <p className="text-muted-foreground text-xs">e.g. <code className="bg-muted px-1 rounded">http://localhost:8000</code> or <code className="bg-muted px-1 rounded">https://api.yourapp.com</code></p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <p className="font-medium">Enter agent URL (where the agent is running)</p>
                  <p className="text-muted-foreground text-xs">Default: <code className="bg-muted px-1 rounded">http://localhost:3050</code> — change only if you run it on a different port or machine.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                <div>
                  <p className="font-medium">Add credentials (if your API requires authentication)</p>
                  <p className="text-muted-foreground text-xs">Username and password for login. Stored in your browser only — never sent to LoadPulse.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Server Config */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="w-5 h-5" />
                Server
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="serverUrl">API Server URL</Label>
                <Input
                  id="serverUrl"
                  placeholder="https://api.yourapp.com"
                  value={serverUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServerUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="agentUrl">Agent URL</Label>
                <Input
                  id="agentUrl"
                  placeholder="http://localhost:3050"
                  value={agentUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgentUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Credentials */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-5 h-5" />
                Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Stored in browser only. Never sent to LoadPulse servers.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Connect Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        {!agentConnected ? (
          <Button
            size="lg"
            onClick={handleConnect}
            disabled={showSpinner || !serverUrl}
            className="gap-2"
          >
            {showSpinner ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {showSpinner ? "Connecting..." : "Connect & Discover"}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            onClick={handleDisconnect}
            className="gap-2"
          >
            <WifiOff className="w-4 h-4" />
            Disconnect
          </Button>
        )}
      </motion.div>

      {/* Status cards */}
      {agentConnected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-3"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold text-emerald-500">Connected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <List className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Endpoints</p>
                  <p className="font-semibold text-2xl">{endpoints.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Server</p>
                  <p className="font-semibold text-sm truncate max-w-[150px]">
                    {serverUrl}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Endpoint groups */}
      {endpoints.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discovered Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(groups)
                  .sort(([, a], [, b]) => b - a)
                  .map(([group, count]) => (
                    <Badge
                      key={group}
                      variant="secondary"
                      className="text-sm py-1 px-3"
                    >
                      {group}{" "}
                      <span className="ml-1 text-muted-foreground">
                        {count}
                      </span>
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
