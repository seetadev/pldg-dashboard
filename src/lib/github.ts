import { GitHubData } from '@/types/dashboard';
import useSWR from 'swr';

const fetcher = async (): Promise<GitHubData> => {
  console.log('Fetching GitHub data...');
  const response = await fetch('/api/github');

  if (!response.ok) {
    console.error('GitHub API error:', {
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString()
    });
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const rawData = await response.json();

  console.log('GitHub raw data:', {
    hasData: !!rawData,
    statusGroups: rawData?.statusGroups,
    issueCount: rawData?.issues?.length,
    timestamp: new Date().toISOString()
  });

  if (!rawData || !rawData.statusGroups) {
    console.error('Invalid GitHub response format:', {
      hasData: !!rawData,
      statusGroups: rawData?.statusGroups,
      timestamp: new Date().toISOString()
    });
    throw new Error('Invalid GitHub response format');
  }

  return {
    issues: rawData.issues || [],
    statusGroups: rawData.statusGroups,
    project: rawData.project || { user: { projectV2: { items: { nodes: [] } } } },
    projectBoard: rawData.projectBoard || { issues: [], statusGroups: { todo: 0, inProgress: 0, done: 0 }, project: {} },
    userContributions: rawData.userContributions || {},
    timestamp: Date.now()
  };
};

export function useGitHubData() {
  const { data, error, isValidating, mutate } = useSWR<GitHubData>(
    '/api/github',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000);
      }
    }
  );

  return {
    data,
    isLoading: !error && !data && isValidating,
    isError: !!error,
    mutate,
    timestamp: data?.timestamp
  };
}
