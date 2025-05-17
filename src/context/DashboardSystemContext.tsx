"use client";

import * as React from "react";
import { ProcessedData } from "@/types/dashboard";
import { useDashboardSystem } from "@/lib/system";

interface DashboardSystemContextType {
  data: ProcessedData | null;
  isLoading: boolean;
  isError: boolean;
  isStale: boolean;
  lastUpdated: number;
  isFetching: boolean;
  refresh: () => Promise<void>;
}

const DashboardSystemContext = React.createContext<
  DashboardSystemContextType | undefined
>(undefined);

export function DashboardSystemProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemData = useDashboardSystem();

  return (
    <DashboardSystemContext.Provider value={systemData}>
      {children}
    </DashboardSystemContext.Provider>
  );
}

export function useDashboardSystemContext() {
  const context = React.useContext(DashboardSystemContext);
  if (!context) {
    throw new Error(
      "useDashboardSystemContext must be used within a DashboardSystemProvider"
    );
  }
  return context;
}
