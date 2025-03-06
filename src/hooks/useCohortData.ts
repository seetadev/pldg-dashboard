import { useState, useEffect } from 'react';
import { CohortId, COHORT_DATA } from '@/types/cohort';
import { EngagementData, ProcessedData } from '@/types/dashboard';
import { loadCohortData } from '@/lib/data-processing';
import Papa from 'papaparse';
import { useDashboardSystemContext } from '@/context/DashboardSystemContext';

interface CohortCache {
  rawData: EngagementData[];
  processedData: ProcessedData | null;
  lastUpdated: number;
}

interface UseCohortDataResult {
  data: EngagementData[];
  processedData: ProcessedData | null;
  isLoading: boolean;
  error: string | null; 
  cache: Partial<Record<CohortId, CohortCache>>;
}

export function useCohortData(selectedCohort: CohortId): UseCohortDataResult  {
  const [cache, setCache] = useState<Partial<Record<CohortId, CohortCache>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { errorHandler } = useDashboardSystemContext();

  useEffect(() => {
    async function loadCohortDataWithCache() {
      // Always set loading to true when cohort changes
      setIsLoading(true);
      setError(null);
      try {
      // Check cache first
      if (cache[selectedCohort] && 
          Date.now() - cache[selectedCohort].lastUpdated < 5 * 60 * 1000) { // 5 minute cache
        setIsLoading(false);
        return;
      }

      try {
        const csvText = await loadCohortData(selectedCohort);
        
        Papa.parse<EngagementData>(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          complete: (results) => {
            console.log('Cohort Data Loaded:', {
              cohort: selectedCohort,
              rows: results.data.length,
              weekRange: results.data.map(d => d['Program Week'])
            });

            setCache(prev => ({
              ...prev,
              [selectedCohort]: {
                rawData: results.data,
                processedData: null, // Will be processed on demand
                lastUpdated: Date.now()
              }
            }));
            setIsLoading(false);
          },
          error: (error: any) => {
            console.error('CSV parsing error:', error);
            setError(error.message);
            errorHandler(error, `Failed to parse CSV`); // Use errorHandler
            setIsLoading(false);
          }
        });
      } catch (error: any) {
        console.error('Failed to load cohort data:', error);
        errorHandler(error, `Failed to load cohort data:`);
        setError(error instanceof Error ? error.message : 'Failed to load data');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Failed to load cache data:', error);
      errorHandler(error, `Failed to load cache data:`);
      setError(error instanceof Error ? error.message : 'Failed to load cache data');
      setIsLoading(false);
    }
  }

    loadCohortDataWithCache();
  }, [selectedCohort, errorHandler]);

  return {
    data: cache[selectedCohort]?.rawData ?? [],
    processedData: cache[selectedCohort]?.processedData ?? null,
    isLoading,
    error,
    cache
  };
} 