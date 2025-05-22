'use client';

import { ProcessedData, EngagementData } from '@/types/dashboard';
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  ReactNode,
} from 'react';
import { CohortId } from '@/types/cohort';
import { loadCohortData, processData } from '@/lib/data-processing';
import { trackCohortUsage } from '@/lib/analytics';
import Papa from 'papaparse';

interface DashboardSystemContextType {
  data: ProcessedData | null;
  isLoading: boolean;
  isError: boolean;
  isStale: boolean;
  error: string | null;
  lastUpdated: string;
  isFetching: boolean;
  refresh: () => Promise<void>;
  selectedCohort: CohortId;
  setSelectedCohort: (cohort: CohortId) => void;
}

interface CachedData {
  data: ProcessedData;
  timestamp: number;
}

export const DashboardSystemContext = createContext<
  DashboardSystemContextType | undefined
>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export function DashboardSystemProvider({ children }: { children: ReactNode }) {
  const [selectedCohort, setSelectedCohort] = useState<CohortId>('2');
  const [data, setData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toISOString()
  );
  const [isFetching, setIsFetching] = useState(false);

  // Add cache ref
  const dataCache = useRef<Record<CohortId, CachedData>>({
    '1': { data: data as ProcessedData, timestamp: 0 },
    '2': { data: data as ProcessedData, timestamp: 0 },
  });

  const loadCohortDataWithCache = async (cohortId: CohortId) => {
    const cached = dataCache.current[cohortId];
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      trackCohortUsage(cohortId, 'view', {
        activeContributors: cached.data.activeContributors,
        totalContributions: cached.data.totalContributions,
        engagementRate: cached.data.programHealth.engagementRate,
      });
      return cached.data;
    }

    try {
      setIsFetching(true);
      const csvText = await loadCohortData(cohortId);

      return new Promise<ProcessedData>((resolve, reject) => {
        Papa.parse<EngagementData>(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          complete: (results) => {
            const processedData = processData(results.data, null, cohortId);
            dataCache.current[cohortId] = {
              data: processedData,
              timestamp: now,
            };

            // Track cohort data load
            trackCohortUsage(cohortId, 'refresh', {
              activeContributors: processedData.activeContributors,
              totalContributions: processedData.totalContributions,
              engagementRate: processedData.programHealth.engagementRate,
            });

            resolve(processedData);
          },
          error: (error: Error) => {
            console.error('CSV parsing error:', error);
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error(`Error loading cohort ${cohortId} data:`, error);
      throw error;
    } finally {
      setIsFetching(false);
    }
  };

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const freshData = await loadCohortDataWithCache(selectedCohort);
      setData(freshData);
      setLastUpdated(new Date().toISOString());
      setIsError(false);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setIsError(true);
      setError(
        error instanceof Error ? error.message : 'Failed to refresh data'
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedCohort]);

  // Track cohort switches
  const handleCohortChange = (newCohortId: CohortId) => {
    trackCohortUsage(newCohortId, 'switch');
    setSelectedCohort(newCohortId);
  };

  useEffect(() => {
    refresh();
  }, [selectedCohort, refresh]);

  return (
    <DashboardSystemContext.Provider
      value={{
        data,
        isLoading,
        isError,
        error,
        refresh,
        isStale: false,
        lastUpdated,
        isFetching,
        selectedCohort,
        setSelectedCohort: handleCohortChange,
      }}
    >
      {children}
    </DashboardSystemContext.Provider>
  );
}

export function useDashboardSystemContext() {
  const context = useContext(DashboardSystemContext);
  if (!context) {
    throw new Error(
      'useDashboardSystemContext must be used within a DashboardSystemProvider'
    );
  }
  return context;
}
