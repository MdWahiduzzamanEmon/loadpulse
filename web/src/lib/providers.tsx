"use client";

import ReduxProvider from "@/store/ReduxProvider/ReduxProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ReduxProvider>{children}</ReduxProvider>;
}
