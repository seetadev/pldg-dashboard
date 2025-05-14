import { useState, useEffect } from 'react';
import { CohortId, COHORT_DATA } from '@/types/cohort';
import { EngagementData, ProcessedData,FeedbackEntry } from '@/types/dashboard';
import { loadCohortData } from '@/lib/data-processing';
import Papa from 'papaparse';
import normalizeEngagementData from '@/lib/formatDbData';

interface CohortCache {
  rawData: EngagementData[];
  partnerFeedbackData: FeedbackEntry[];
  processedData: ProcessedData | null;
  lastUpdated: number;
}

export function useCohortData(selectedCohort: CohortId) {
  const [cache, setCache] = useState<Record<CohortId, CohortCache>>({
    "1": { rawData: [], processedData: null, partnerFeedbackData: [], lastUpdated: 0 },
    "2": { rawData: [], processedData: null, partnerFeedbackData: [], lastUpdated: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCohortDataWithCache() {
      // Always set loading to true when cohort changes
      setIsLoading(true);
      setError(null);

      // Check cache first
      if (
        cache[selectedCohort] &&
        Date.now() - cache[selectedCohort].lastUpdated < 5 * 60 * 1000
      ) {
        // 5 minute cache
        setIsLoading(false);
        return;
      }

      try {
        // Fetch the CSV data from the API
        const response = await fetch(`/api/cohort?id=${selectedCohort}`);

        const partnerFeedbackResponse = await fetch(`/api/cohort-feedback?id=${selectedCohort}`);

        const partnerResponse = await partnerFeedbackResponse.json();

        console.log('Partner Feedback Data:', partnerResponse);

        const rawData: Record<string, any>[] = await response.json();

         // Normalize each entry
        const cleanedData: EngagementData[] = rawData.map(normalizeEngagementData);

        setCache(prev => ({
          ...prev,
          [selectedCohort]: {
            rawData: cleanedData,
            partnerFeedbackData: partnerResponse,
            processedData: null, // Will be processed on demand
            lastUpdated: Date.now()
          }
        }));
        
        setIsLoading(false);


      } catch (error) {
        console.error("Failed to load cohort data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load data",
        );
        setIsLoading(false);
      }
    }

    loadCohortDataWithCache();
  }, [selectedCohort, cache]);

  return {
    data: cache[selectedCohort]?.rawData ?? [],
    partnerFeedbackData: cache[selectedCohort]?.partnerFeedbackData ?? {},
    processedData: cache[selectedCohort]?.processedData ?? null,
    isLoading,
    error,
    cache,
  };
}
