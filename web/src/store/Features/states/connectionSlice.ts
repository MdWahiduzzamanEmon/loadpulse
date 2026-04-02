import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Endpoint, ServerConnection } from "@/lib/types";

interface ConnectionState {
  server: ServerConnection | null;
  agentConnected: boolean;
  endpoints: Endpoint[];
  selectedEndpoints: string[];
}

const initialState: ConnectionState = {
  server: null,
  agentConnected: false,
  endpoints: [],
  selectedEndpoints: [],
};

const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    setServer(state, action: PayloadAction<ServerConnection | null>) {
      state.server = action.payload;
    },
    setAgentConnected(state, action: PayloadAction<boolean>) {
      state.agentConnected = action.payload;
    },
    setEndpoints(state, action: PayloadAction<Endpoint[]>) {
      state.endpoints = action.payload;
    },
    setSelectedEndpoints(state, action: PayloadAction<string[]>) {
      state.selectedEndpoints = action.payload;
    },
    toggleEndpoint(state, action: PayloadAction<string>) {
      const path = action.payload;
      const idx = state.selectedEndpoints.indexOf(path);
      if (idx >= 0) {
        state.selectedEndpoints.splice(idx, 1);
      } else {
        state.selectedEndpoints.push(path);
      }
    },
    selectAllEndpoints(state) {
      state.selectedEndpoints = state.endpoints
        .filter((e) => e.method === "GET")
        .map((e) => e.path);
    },
    deselectAllEndpoints(state) {
      state.selectedEndpoints = [];
    },
    selectGroup(state, action: PayloadAction<string>) {
      const group = action.payload;
      const paths = state.endpoints
        .filter((e) => e.group === group && e.method === "GET")
        .map((e) => e.path);
      const existing = new Set(state.selectedEndpoints);
      paths.forEach((p) => existing.add(p));
      state.selectedEndpoints = [...existing];
    },
    deselectGroup(state, action: PayloadAction<string>) {
      const group = action.payload;
      const pathsToRemove = new Set(
        state.endpoints.filter((e) => e.group === group).map((e) => e.path)
      );
      state.selectedEndpoints = state.selectedEndpoints.filter(
        (p) => !pathsToRemove.has(p)
      );
    },
  },
});

export const {
  setServer,
  setAgentConnected,
  setEndpoints,
  setSelectedEndpoints,
  toggleEndpoint,
  selectAllEndpoints,
  deselectAllEndpoints,
  selectGroup,
  deselectGroup,
} = connectionSlice.actions;

export default connectionSlice.reducer;
