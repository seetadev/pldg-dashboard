import { EngagementData } from '@/types/dashboard';
import useSWR from 'swr';

export function useAirtableData() {
  const { data, error, isValidating, mutate } = useSWR<EngagementData[]>(
    '/api/airtable',
    async () => {
      const response = await fetch('/api/airtable');

      if (!response.ok) {
        console.error('Airtable API error:', response.statusText);
        throw new Error(`Airtable API error: ${response.statusText}`);
      }

      const rawData = await response.json();
      if (!Array.isArray(rawData)) {
        console.error('Invalid Airtable response format:', rawData);
        throw new Error('Invalid Airtable response format');
      }

      return rawData;
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
      onError: (err) => {
        console.error('Airtable data fetch error:', err);
      },
    }
  );

  const result = {
    data: data || [],
    isLoading: !error && !data && isValidating,
    isError: !!error,
    mutate,
    timestamp: Date.now(),
  };

  return result;
}
