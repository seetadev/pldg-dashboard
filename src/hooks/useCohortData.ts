import { useState, useEffect } from 'react';
import { CohortId } from '@/types/cohort';
import {
  EngagementData,
  ProcessedData,
  FeedbackEntry,
} from '@/types/dashboard';
import normalizeEngagementData from '@/lib/formatDbData';

interface CohortCache {
  rawData: EngagementData[];
  partnerFeedbackData: FeedbackEntry[];
  processedData: ProcessedData | null;
  lastUpdated: number;
}

export function useCohortData(selectedCohort: CohortId) {
  const [cache, setCache] = useState<Record<CohortId, CohortCache>>({
    '1': {
      rawData: [],
      processedData: null,
      partnerFeedbackData: [],
      lastUpdated: 0,
    },
    '2': {
      rawData: [],
      processedData: null,
      partnerFeedbackData: [],
      lastUpdated: 0,
    },
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
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Cohort API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            cohortId: selectedCohort
          });
          throw new Error(`Failed to fetch cohort data: ${response.statusText}`);
        }

        const rawData = await response.json();
        console.log('Cohort API response:', {
          status: response.status,
          dataLength: rawData?.length,
          sampleData: rawData?.[0]
        });

        const partnerFeedbackResponse = await fetch(
          `/api/cohort-feedback?id=${selectedCohort}`
        );
        if (!partnerFeedbackResponse.ok) {
          const errorText = await partnerFeedbackResponse.text();
          console.error('Partner Feedback API error:', {
            status: partnerFeedbackResponse.status,
            statusText: partnerFeedbackResponse.statusText,
            error: errorText,
            cohortId: selectedCohort
          });
          throw new Error(`Failed to fetch partner feedback: ${partnerFeedbackResponse.statusText}`);
        }

        const partnerResponse = await partnerFeedbackResponse.json();
        console.log('Partner Feedback Data:', {
          status: partnerFeedbackResponse.status,
          dataLength: partnerResponse?.length,
          sampleData: partnerResponse?.[0]
        });

        // Normalize each entry
        const cleanedData: EngagementData[] = rawData.map(
          normalizeEngagementData
        );

        setCache((prev) => ({
          ...prev,
          [selectedCohort]: {
            rawData: cleanedData,
            partnerFeedbackData: partnerResponse,
            processedData: null, // Will be processed on demand
            lastUpdated: Date.now(),
          },
        }));

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load cohort data:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          cohortId: selectedCohort,
          timestamp: new Date().toISOString()
        });
        setError(
          error instanceof Error ? error.message : 'Failed to load data'
        );
        setIsLoading(false);

        // Reset cache for this cohort to prevent stale data
        setCache((prev) => ({
          ...prev,
          [selectedCohort]: {
            rawData: [],
            processedData: null,
            partnerFeedbackData: [],
            lastUpdated: 0,
          },
        }));
      }
    }

    loadCohortDataWithCache();
  }, [selectedCohort, cache]);

  return {
    data: cache[selectedCohort]?.rawData ?? [],
    partnerFeedbackData: cache[selectedCohort]?.partnerFeedbackData ?? [],
    processedData: cache[selectedCohort]?.processedData ?? null,
    isLoading,
    error,
    cache,
  };
}
