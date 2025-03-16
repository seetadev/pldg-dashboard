import { EngagementData } from '@/types/dashboard';
import useSWR from 'swr';

export function useAirtableData() {
  const { data, error, isValidating, mutate } = useSWR<EngagementData[]>(
    '/api/airtable',
    async () => {
      console.log('Fetching Airtable data...');
      const response = await fetch('/api/airtable');

      if (!response.ok) {
        console.error('Airtable API error:', response.statusText);
        throw new Error(`Airtable API error: ${response.statusText}`);
      }

      const rawData = await response.json();
      console.log('Airtable raw response:', {
        hasData: Array.isArray(rawData),
        recordCount: Array.isArray(rawData) ? rawData.length : 0,
        sampleRecord: Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : null
      });

      if (!Array.isArray(rawData)) {
        console.error('Invalid Airtable response format:', rawData);
        throw new Error('Invalid Airtable response format');
      }

      console.log('Airtable data received:', {
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
        console.error('Airtable data fetch error:', err);
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

  console.log('Airtable Hook Result:', {
    hasData: !!result.data?.length,
    recordCount: result.data?.length || 0,
    sampleRecord: result.data?.[0],
    isLoading: result.isLoading,
    isError: result.isError,
    timestamp: new Date(result.timestamp).toISOString()
  });

  return result;
}
