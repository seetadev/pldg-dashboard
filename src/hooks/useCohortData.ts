import { useState, useEffect } from 'react';
import { CohortId, COHORT_DATA } from '@/types/cohort';
import { EngagementData, ProcessedData } from '@/types/dashboard';
import { loadCohortData } from '@/lib/data-processing';
import Papa from 'papaparse';

interface CohortCache {
  rawData: EngagementData[];
  processedData: ProcessedData | null;
  lastUpdated: number;
}

export function useCohortData(selectedCohort: CohortId) {
  const [cache, setCache] = useState<Record<CohortId, CohortCache>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCohortDataWithCache() {
      // Always set loading to true when cohort changes
      setIsLoading(true);
      setError(null);

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
          error: (error) => {
            console.error('CSV parsing error:', error);
            setError(error.message);
            setIsLoading(false);
          }
        });
      } catch (error) {
        console.error('Failed to load cohort data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
        setIsLoading(false);
      }
    }

    loadCohortDataWithCache();
  }, [selectedCohort]);

  return {
    data: cache[selectedCohort]?.rawData ?? [],
    processedData: cache[selectedCohort]?.processedData ?? null,
    isLoading,
    error,
    cache
  };
} 