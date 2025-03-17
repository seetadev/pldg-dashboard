"use client";

import * as React from 'react';
import { ProcessedData, EngagementData } from '@/types/dashboard';
import { useDashboardSystem } from '@/lib/system';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CohortId, COHORT_DATA } from '@/types/cohort';
import { loadCohortData, processData } from '@/lib/data-processing';
import { trackCohortUsage } from '@/lib/analytics';
import Papa from 'papaparse';
import { toast } from '../components/ui/use-toast';
import { errorMonitor } from 'events';

interface DashboardSystemContextType {
  data: ProcessedData | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  lastUpdated: string;
  isFetching: boolean;
  refresh: () => Promise<void>;
  selectedCohort: CohortId;
  setSelectedCohort: (cohort: CohortId) => void;
  setIsError: (isError: boolean) => void;
  loadCohortDataWithCache: (cohort: CohortId) => Promise<void>;
  handleCohortChange: (cohort: CohortId) => void;
  errorHandler: (error: Error, message?: string) => void; // Add errorHandler
}

interface CachedData {
  data: ProcessedData;
  timestamp: number;
}

export const DashboardSystemContext = createContext<DashboardSystemContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export function DashboardSystemProvider({ children }: { children: React.ReactNode }) {
  const [selectedCohort, setSelectedCohort] = useState<CohortId>('2');
  const [data, setData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [isFetching, setIsFetching] = useState(false);
  
  // Add cache ref
  const dataCache = React.useRef<Partial<Record<CohortId, CachedData>>>({});

  // Error Handler Function
  const errorHandler = useCallback(
    (error: Error, message?: string) => {
      console.error('Dashboard Error:', error.message, error.stack);
      setIsError(true);
      toast({
        variant: 'destructive',
        title: message || 'An error occurred.',
        description: error.message,
      });
    },
    [toast]
  );

  const loadCohortDataWithCache = useCallback(async (cohortId: CohortId) => {
    const cached = dataCache.current[cohortId];
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log(`Using cached data for cohort ${cohortId}`);
      trackCohortUsage(cohortId, 'view', {
        activeContributors: cached.data.activeContributors,
        totalContributions: cached.data.totalContributions,
        engagementRate: cached.data.programHealth.engagementRate
      });
      return cached.data;
    }

    try {
      setIsFetching(true);
      setIsError(false);
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
              timestamp: now
            };
            
            // Track cohort data load
            trackCohortUsage(cohortId, 'refresh', {
              activeContributors: processedData.activeContributors,
              totalContributions: processedData.totalContributions,
              engagementRate: processedData.programHealth.engagementRate
            });
            
            resolve(processedData);
          },
          error: (error: any) => {
            console.error('CSV parsing error:', error);
            reject(error);
          }
        });
      });
    } catch (error: any) {
      console.error(`Error loading cohort ${cohortId} data:`, error);
      errorHandler(error, `Failed to load Cohort ${cohortId} data`)
      setIsError(true)
    } finally {
      setIsFetching(false);
    }
  }, [errorHandler]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const freshData = await loadCohortDataWithCache(selectedCohort);
      if (freshData) {
        setData(freshData);
      } else {
        setData(null);
      }
      setLastUpdated(new Date().toISOString());
      toast({
        title: 'Data Refreshed',
        description: 'Successfully refreshed data from Airtable.',
      });
      setIsError(false);
    } catch (error: any) {
      errorHandler(error, 'Failed to refresh data.');
      setIsError(true);
      setError(error instanceof Error ? error.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [toast, errorHandler]);

  // Track cohort switches
  const handleCohortChange = useCallback((newCohortId: CohortId) => {
    trackCohortUsage(newCohortId, 'switch');
    setSelectedCohort(newCohortId);
  }, [loadCohortDataWithCache]);

  // Load data when cohort changes
  useEffect(() => {
    refresh();
  }, [selectedCohort]);

  return (
    <DashboardSystemContext.Provider value={{
      data,
      isLoading,
      isError,
      error,
      setIsError,
      loadCohortDataWithCache: loadCohortDataWithCache as (cohort: CohortId) => Promise<void>,
      errorHandler,
      handleCohortChange,
      refresh,
      lastUpdated,
      isFetching,
      selectedCohort,
      setSelectedCohort: handleCohortChange
    }}>
      {children}
    </DashboardSystemContext.Provider>
  );
}

export function useDashboardSystemContext() {
  const context = React.useContext(DashboardSystemContext);
  if (!context) {
    throw new Error('useDashboardSystemContext must be used within a DashboardSystemProvider');
  }
  return context;
}