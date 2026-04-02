"use client";

/**
 * WebSocket client for communicating with the agent.
 *
 * Connection flow:
 * 1. Browser connects to agent WebSocket (localhost:3050/ws)
 * 2. Browser sends "discover" with server URL + credentials
 * 3. Agent tries to reach the target server and fetch endpoints
 * 4. Only after successful discovery → "agentConnected" = true
 * 5. If discovery fails → error shown, connection stays false
 */

import { store } from "@/store";
import { setAgentConnected, setEndpoints } from "@/store/Features/states/connectionSlice";
import { addResult, addStressLevel, setSummary, setProgress, addLog, setStatus } from "@/store/Features/states/testRunSlice";

let ws: WebSocket | null = null;
let autoReconnect = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentAgentUrl: string | null = null;
// Callback for the Connect page to know when discovery fails
let _onDiscoveryError: ((msg: string) => void) | null = null;

export function connectToAgent(
  agentUrl: string,
  onConnected?: () => void,
  onError?: (msg: string) => void,
  onDiscoveryError?: (msg: string) => void,
) {
  _onDiscoveryError = onDiscoveryError || onError || null;
  // Close existing connection first
  if (ws) {
    autoReconnect = false;
    ws.close();
    ws = null;
  }

  currentAgentUrl = agentUrl;
  const wsUrl = agentUrl.replace(/^http/, "ws") + "/ws";

  try {
    ws = new WebSocket(wsUrl);
  } catch {
    onError?.("Invalid agent URL");
    return;
  }

  ws.onopen = () => {
    autoReconnect = true;
    store.dispatch(addLog("WebSocket connected to agent"));
    onConnected?.();
  };

  ws.onclose = () => {
    ws = null;
    if (autoReconnect && currentAgentUrl) {
      // Only auto-reconnect if intentionally connected (not after manual disconnect)
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        if (autoReconnect && currentAgentUrl) {
          connectToAgent(currentAgentUrl);
        }
      }, 5000);
    }
  };

  ws.onerror = () => {
    onError?.(`Cannot reach agent at ${agentUrl}. Is it running?`);
    store.dispatch(addLog(`Agent connection failed: ${agentUrl}`));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "endpoints":
          store.dispatch(setEndpoints(msg.data));
          // Mark as fully connected only after successful endpoint discovery
          store.dispatch(setAgentConnected(true));
          break;
        case "result":
          store.dispatch(addResult(msg.data));
          break;
        case "stress-level":
          store.dispatch(addStressLevel(msg.data));
          break;
        case "summary":
          store.dispatch(setSummary(msg.data));
          break;
        case "progress":
          store.dispatch(setProgress(msg));
          break;
        case "log":
          store.dispatch(addLog(msg.message));
          break;
        case "error":
          store.dispatch(addLog(`Error: ${msg.message}`));
          // If no endpoints discovered yet, this is a discovery/connection error
          if (store.getState().connection.endpoints.length === 0) {
            store.dispatch(setAgentConnected(false));
            // Notify the Connect page immediately so spinner stops
            _onDiscoveryError?.(msg.message);
            _onDiscoveryError = null;
          }
          store.dispatch(setStatus("error"));
          break;
        case "done":
          store.dispatch(setStatus("done"));
          store.dispatch(addLog("Test complete"));
          break;
      }
    } catch {
      // ignore malformed messages
    }
  };
}

export function disconnectAgent() {
  autoReconnect = false;
  currentAgentUrl = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  ws?.close();
  ws = null;
  store.dispatch(setAgentConnected(false));
}

export function sendToAgent(msg: Record<string, unknown>) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}
