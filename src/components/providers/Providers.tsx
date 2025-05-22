'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { DashboardSystemProvider } from '@/context/DashboardSystemContext';
import { TooltipProvider } from '@radix-ui/react-tooltip';

export function Providers({ children }: { children: ReactNode }) {
  // Use a stable ref to prevent re-renders
  const stableChildren = useRef(children);
  useEffect(() => {
    stableChildren.current = children;
  }, [children]);

  return (
    <DashboardSystemProvider>
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        {stableChildren.current}
      </TooltipProvider>
    </DashboardSystemProvider>
  );
}
