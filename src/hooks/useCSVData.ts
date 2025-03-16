import { useState, useEffect } from 'react';
import Papa, { ParseResult, ParseConfig } from 'papaparse';
import { EngagementData } from '@/types/dashboard';

export function useCSVData() {
  const [data, setData] = useState<EngagementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [timestamp, setTimestamp] = useState<number>(0);

  useEffect(() => {
    async function fetchCSV() {
      try {
        console.log('Fetching CSV data...');
        const response = await fetch('/data/weekly-engagement-data.csv', {
          method: 'GET',
          headers: {
            'Accept': 'text/csv'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch CSV: ' + response.statusText);
        }

        const csvText = await response.text();
        console.log('CSV data received, starting parsing...');

        const parseConfig: ParseConfig<EngagementData> = {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results: ParseResult<EngagementData>) => {
            console.log('CSV parsing complete:', {
              rows: results.data.length,
              fields: results.meta.fields,
              errors: results.errors
            });

            if (results.errors.length > 0) {
              console.error('CSV parsing errors:', results.errors);
            }

            setData(results.data);
            setIsLoading(false);
            setTimestamp(Date.now());
          },
          error: (error: Error) => {
            console.error('CSV parsing error:', error);
            setIsError(true);
            setIsLoading(false);
          }
        } as ParseConfig<EngagementData>;

        Papa.parse(csvText, parseConfig);
      } catch (error) {
        console.error('Error loading CSV:', error);
        setIsError(true);
        setIsLoading(false);
      }
    }

    fetchCSV();
  }, []);

  const mutate = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      console.log('Manually refreshing CSV data...');
      const response = await fetch('/data/weekly-engagement-data.csv', {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch CSV: ' + response.statusText);
      }
      const csvText = await response.text();
      console.log('CSV refresh: data received, starting parsing...');

      const parseConfig: ParseConfig<EngagementData> = {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<EngagementData>) => {
          console.log('CSV refresh parsing complete:', {
            rows: results.data.length,
            fields: results.meta.fields,
            errors: results.errors
          });
          setData(results.data);
          setIsLoading(false);
          setTimestamp(Date.now());
        },
        error: (error: Error) => {
          console.error('CSV parsing error:', error);
          setIsError(true);
          setIsLoading(false);
        }
      } as ParseConfig<EngagementData>;

      Papa.parse(csvText, parseConfig);
    } catch (error) {
      console.error('Error refreshing CSV:', error);
      setIsError(true);
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    isError,
    mutate,
    timestamp
  };
}
