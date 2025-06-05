'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { DashboardSystemProvider } from '@/context/DashboardSystemContext';
import { Tooltip } from 'radix-ui';

export function Providers({ children }: { children: ReactNode }) {
  // Use a stable ref to prevent re-renders
  const stableChildren = useRef(children);
  useEffect(() => {
    stableChildren.current = children;
  }, [children]);

  return (
    <DashboardSystemProvider>
      <Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
        {stableChildren.current}
      </Tooltip.Provider>
    </DashboardSystemProvider>
  );
}
