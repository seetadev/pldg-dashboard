import { useState, useEffect } from 'react';
import Papa, { ParseResult, ParseConfig } from 'papaparse';
import { EngagementData, FeedbackEntry } from '@/types/dashboard';
import { COHORT_CSV_URLS, FEEDBACK_CSV_URLS } from '../lib/ipfs-urls';

export function useIPFSCohortData(selectedCohort: '1' | '2') {
  const [data, setData] = useState<EngagementData[]>([]);
  const [feedbackData, setFeedbackData] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function fetchCSV() {
      setIsLoading(true);
      setIsError(false);
      setFeedbackData([]);
      const url = COHORT_CSV_URLS[selectedCohort];
      if (!url) {
        setIsError(true);
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch CSV: ' + response.statusText);
        }
        const csvText = await response.text();
        
        const parseConfig: ParseConfig<EngagementData> = {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results: ParseResult<EngagementData>) => {
            setData(results.data);
            setIsLoading(false);
          },
        };
        Papa.parse(csvText, parseConfig);
      } catch (error) {
        setIsError(true);
        setIsLoading(false);
        console.error(error);
      }

      const feedbackUrl = FEEDBACK_CSV_URLS[selectedCohort];
      if (feedbackUrl) {
        try {
          const response = await fetch(feedbackUrl);
          if (response.ok) {
            const csvText = await response.text();
            Papa.parse(csvText, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results: ParseResult<FeedbackEntry>) => {
                setFeedbackData(results.data);
              },
            });
          }
        } catch (e) {
          // Optionally handle feedback fetch error
          console.error(e)
        }
      }
    }
    fetchCSV();
  }, [selectedCohort]);

  return { data, feedbackData, isLoading, isError };
} 