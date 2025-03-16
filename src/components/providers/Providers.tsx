"use client";

import * as React from 'react';
import { DashboardSystemProvider } from '@/context/DashboardSystemContext';
import { CohortProvider } from '@/context/CohortContext';
import { TooltipProvider } from '@radix-ui/react-tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  // Use a stable ref to prevent re-renders
  const stableChildren = React.useRef(children);
  React.useEffect(() => {
    stableChildren.current = children;
  }, [children]);

  return (
    <DashboardSystemProvider>
      <CohortProvider>
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          {stableChildren.current}
        </TooltipProvider>
      </CohortProvider>
    </DashboardSystemProvider>
  );
}