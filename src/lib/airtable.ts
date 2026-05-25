import { EngagementData } from '@/types/dashboard';
import useSWR from 'swr';
import { Logger, debugLog, infoLog, warnLog, errorLog } from './logger';

export function useAirtableData() {
      const { data, error, isValidating, mutate } = useSWR<EngagementData[]>(
        '/api/airtable',
        async () => {
          debugLog('Fetching Airtable data...');
          const response = await fetch('/api/airtable');

          if (!response.ok) {
            errorLog('Airtable API error:', response.statusText);
            throw new Error(`Airtable API error: ${response.statusText}`);
          }

          const rawData = await response.json();
          debugLog('Airtable raw response:', {
            hasData: Array.isArray(rawData),
            recordCount: Array.isArray(rawData) ? rawData.length : 0,
            sampleRecord: Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : null
          });

          if (!Array.isArray(rawData)) {
            errorLog('Invalid Airtable response format:', rawData);
            throw new Error('Invalid Airtable response format');
          }

          debugLog('Airtable data received:', {
            recordCount: rawData.length,
            sampleRecord: rawData[0],
            timestamp: new Date().toISOString()
          });

          return rawData;
      },
      {
        refreshInterval: 60000,
        revalidateOnFocus: true,
        dedupingInterval: 10000,
        onError: (err) => {
          errorLog('Airtable data fetch error:', err);
        }
      }
    );

  const result = {
    data: data || [],
    isLoading: !error && !data && isValidating,
    isError: !!error,
    mutate,
    timestamp: Date.now()
  };

  debugLog('Airtable Hook Result:', {
    hasData: !!result.data?.length,
    recordCount: result.data?.length || 0,
    sampleRecord: result.data?.[0],
    isLoading: result.isLoading,
    isError: result.isError,
    timestamp: new Date(result.timestamp).toISOString()
  });

  return result;
}
