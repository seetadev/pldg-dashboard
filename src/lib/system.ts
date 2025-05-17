import { useCallback, useMemo } from 'react';
import { useAirtableData } from './airtable';
import { useGitHubData } from './github';
import { useCSVData } from '@/hooks/useCSVData';
import { processData } from './data-processing';
import { GitHubData } from '@/types/dashboard';

export function useDashboardSystem() {
  const {
    data: csvData,
    isLoading: isCSVLoading,
    isError: isCSVError,
    mutate: refreshCSV,
    timestamp: csvTimestamp,
  } = useCSVData();

  const {
    data: airtableData,
    isLoading: isAirtableLoading,
    isError: isAirtableError,
    mutate: refreshAirtable,
    timestamp: airtableTimestamp,
  } = useAirtableData();

  const {
    data: githubData,
    isLoading: isGithubLoading,
    isError: isGithubError,
    mutate: refreshGithub,
    timestamp: githubTimestamp,
  } = useGitHubData();

  const processedData = useMemo(() => {
    // Try CSV data first - make GitHub data optional
    if (!isCSVLoading && csvData?.length > 0) {
      try {
        console.log('Processing CSV data...');
        // Transform CSV data to match Airtable format
        const transformedData = csvData.map((entry) => ({
          Name: entry.Name,
          'Program Week': entry['Program Week'],
          'Which Tech Partner': entry['Which Tech Partner'] || '',
          'Tech Partner Collaboration?':
            entry['Tech Partner Collaboration?'] || 'No',
          'Engagement Participation ':
            entry['Engagement Participation '] || '1 - Low',
          'How many issues, PRs, or projects this week?':
            entry['How many issues, PRs, or projects this week?'] || '0',
          'Issue Title 1': entry['Issue Title 1'] || '',
          'Issue Link 1': entry['Issue Link 1'] || '',
          'How likely are you to recommend the PLDG to others?':
            entry['How likely are you to recommend the PLDG to others?'] || '0',
          'PLDG Feedback': entry['PLDG Feedback'] || '',
        }));

        const mockGitHubData: GitHubData = {
          project: {
            user: {
              projectV2: {
                items: {
                  nodes: [],
                },
              },
            },
          },
          issues: [],
          statusGroups: {
            todo: 0,
            inProgress: 0,
            done: 0,
          },
          timestamp: Date.now(),
        };

        console.log('Transformed CSV data:', {
          recordCount: transformedData.length,
          sampleRecord: transformedData[0],
        });

        const result = processData(
          transformedData,
          githubData || mockGitHubData
        );
        return result;
      } catch (error) {
        console.error('Error processing CSV data:', error);
        // Fall through to try Airtable data
      }
    }

    // Fall back to Airtable data if CSV fails or is unavailable
    if (!isAirtableLoading && airtableData?.length > 0) {
      try {
        console.log('Processing Airtable data...');
        const mockGitHubData: GitHubData = {
          project: {
            user: {
              projectV2: {
                items: {
                  nodes: [],
                },
              },
            },
          },
          issues: [],
          statusGroups: {
            todo: 0,
            inProgress: 0,
            done: 0,
          },
          timestamp: Date.now(),
        };
        const result = processData(airtableData, githubData || mockGitHubData);
        return result;
      } catch (error) {
        console.error('Error processing Airtable data:', error);
        return null;
      }
    }

    // If both data sources fail and we're still loading, return null
    if (
      (isCSVLoading && !csvData?.length) ||
      (isAirtableLoading && !airtableData?.length) ||
      isGithubLoading
    ) {
      console.log('Still loading initial data...');
      return null;
    }

    console.error('No valid data available from any source');
    return null;
  }, [
    csvData,
    airtableData,
    githubData,
    isCSVLoading,
    isAirtableLoading,
    isGithubLoading,
  ]);

  return {
    data: processedData,
    isLoading:
      (isCSVLoading && !csvData?.length) ||
      (isAirtableLoading && !airtableData?.length) ||
      (isGithubLoading && !githubData?.statusGroups),
    isError: (isCSVError && isAirtableError) || isGithubError,
    isStale: false,
    lastUpdated: Math.max(
      csvTimestamp || 0,
      airtableTimestamp || 0,
      githubTimestamp || 0
    ),
    isFetching: isCSVLoading || isAirtableLoading || isGithubLoading,
    refresh: useCallback(async () => {
      console.log('Starting Refresh');
      try {
        await Promise.all([refreshCSV(), refreshAirtable(), refreshGithub()]);
        console.log('Refresh Complete');
      } catch (error) {
        console.error('Refresh Failed:', error);
        throw error;
      }
    }, [refreshCSV, refreshAirtable, refreshGithub]),
  };
}
