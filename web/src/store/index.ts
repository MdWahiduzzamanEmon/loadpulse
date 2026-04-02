/**
 * Redux Store Configuration
 *
 * Configures the Redux store with all feature slices.
 * Follows the same pattern as helpo-admin/src/store/index.ts
 */

import { configureStore } from "@reduxjs/toolkit";
import connectionSlice from "./Features/states/connectionSlice";
import testRunSlice from "./Features/states/testRunSlice";

export const store = configureStore({
  reducer: {
    connection: connectionSlice,
    testRun: testRunSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
