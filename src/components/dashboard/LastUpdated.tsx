'use client';

import { useDashboardSystemContext } from '@/context/DashboardSystemContext';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export function LastUpdated() {
  const { lastUpdated, isStale, refresh, isFetching } =
    useDashboardSystemContext();

  const handleRefresh = async () => {
    try {
      await refresh();
      toast({
        title: 'Data refreshed',
        description: 'Dashboard data has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Unable to refresh dashboard data. Please try again.',
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-sm ${isStale ? 'text-yellow-400' : 'text-indigo-200'}`}
      >
        {isStale
          ? 'Data is stale'
          : `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isFetching}
        className={`${isStale ? 'text-yellow-400 border-yellow-400' : ''}`}
      >
        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
