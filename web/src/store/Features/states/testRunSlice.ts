import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  RequestResult,
  StressLevel,
  TestSummary,
  TestStatus,
  TestRun,
} from "@/lib/types";

interface TestRunState {
  status: TestStatus;
  results: RequestResult[];
  stressLevels: StressLevel[];
  summary: TestSummary | null;
  progress: { completed: number; total: number; phase?: string };
  logs: string[];
  history: TestRun[];
}

const initialState: TestRunState = {
  status: "idle",
  results: [],
  stressLevels: [],
  summary: null,
  progress: { completed: 0, total: 0 },
  logs: [],
  history: [],
};

const testRunSlice = createSlice({
  name: "testRun",
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<TestStatus>) {
      state.status = action.payload;
    },
    addResult(state, action: PayloadAction<RequestResult>) {
      state.results.push(action.payload);
    },
    addStressLevel(state, action: PayloadAction<StressLevel>) {
      state.stressLevels.push(action.payload);
    },
    setSummary(state, action: PayloadAction<TestSummary>) {
      state.summary = action.payload;
    },
    setProgress(
      state,
      action: PayloadAction<{ completed: number; total: number; phase?: string }>
    ) {
      state.progress = action.payload;
    },
    addLog(state, action: PayloadAction<string>) {
      state.logs.push(action.payload);
      if (state.logs.length > 100) state.logs.shift();
    },
    resetRun(state) {
      state.status = "idle";
      state.results = [];
      state.stressLevels = [];
      state.summary = null;
      state.progress = { completed: 0, total: 0 };
      state.logs = [];
    },
    saveToHistory(state, action: PayloadAction<TestRun>) {
      state.history.unshift(action.payload);
      if (state.history.length > 50) state.history.pop();
    },
    loadHistory(state, action: PayloadAction<TestRun[]>) {
      state.history = action.payload;
    },
    clearHistory(state) {
      state.history = [];
    },
  },
});

export const {
  setStatus,
  addResult,
  addStressLevel,
  setSummary,
  setProgress,
  addLog,
  resetRun,
  saveToHistory,
  loadHistory,
  clearHistory,
} = testRunSlice.actions;

export default testRunSlice.reducer;
