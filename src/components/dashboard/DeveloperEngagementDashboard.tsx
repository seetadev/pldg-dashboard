'use client';

import React from 'react';
import { useDashboardSystemContext } from '@/context/DashboardSystemContext';
import ExecutiveSummary from './ExecutiveSummary';
import { ActionableInsights } from './ActionableInsights';
import EngagementChart from './EngagementChart';
import TechnicalProgressChart from './TechnicalProgressChart';
import { TechPartnerChart } from './TechPartnerChart';
import TopPerformersTable from './TopPerformersTable';
import { LoadingSpinner } from '../ui/loading';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import { enhanceTechPartnerData } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Papa, { ParseResult, ParseConfig, ParseError, Parser } from 'papaparse';
import { processData } from '@/lib/data-processing';
import { ProcessedData } from '@/types/dashboard';
import { EngagementAlerts } from './EngagementAlerts';
import { CohortSelector } from './CohortSelector';
import { CohortId } from '@/types/cohort';
import normalizeEngagementData from '@/lib/formatDBData';

export default function DeveloperEngagementDashboard() {
  const { data, isLoading, isError, refresh, lastUpdated, isFetching, selectedCohort, setSelectedCohort } = useDashboardSystemContext();
  const [csvData, setCsvData] = useState<ProcessedData[]>([]);
  const [isLoadingCSV, setIsLoadingCSV] = useState(true);
  const [errorCSV, setErrorCSV] = useState<string | null>(null);
  
  

  useEffect(() => {
    async function loadCSVData() {
      try {
        console.log('Loading CSV data...');
        const response = await fetch('/data/weekly-engagement-data.csv');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        console.log('CSV loaded, first 100 chars:', csvText.slice(0, 100));

        if (!csvText) {
          throw new Error('CSV file is empty');
        }

        Papa.parse<Record<string, any>>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results: ParseResult<Record<string, any>>) => {
            console.log('CSV parsed, row count:', results.data.length);
            const rawData = results.data;
            const cleanedData: ProcessedData[] = rawData.map(normalizeEngagementData);
            console.log('Data processed:', cleanedData.length);
            setCsvData(cleanedData);
            setIsLoadingCSV(false);
          },
          error: (error: Error) => {
            console.error('Failed to parse CSV:', error);
            setErrorCSV('Failed to parse CSV data');
          }
        });
      } catch (error) {
        console.error('Failed to load CSV:', error);
        setErrorCSV(error instanceof Error ? error.message : 'Failed to load data');
        setIsLoadingCSV(false);
      }
    }
    loadCSVData();
  }, []);

  const processedData = csvData.length > 0 ? processData(csvData) : null;

  const enhancedTechPartnerData = React.useMemo(() =>
    processedData?.techPartnerPerformance && processedData?.rawEngagementData
      ? enhanceTechPartnerData(processedData.techPartnerPerformance, processedData.rawEngagementData)
      : [],
  [processedData?.techPartnerPerformance, processedData?.rawEngagementData]
);

  React.useEffect(() => {
    console.log('Dashboard State:', {
      hasData: !!processedData,
      metrics: processedData ? {
            contributors: processedData.activeContributors,
            techPartners: processedData.programHealth.activeTechPartners,
            engagementTrends: processedData.engagementTrends.length,
            technicalProgress: processedData.technicalProgress.length,
        techPartnerData: enhancedTechPartnerData
      } : null,
      isLoading,
      isError,
      isFetching,
      lastUpdated: new Date(lastUpdated).toISOString()
    });
  }, [processedData, isLoading, isError, isFetching, lastUpdated, enhancedTechPartnerData]);

  if (isLoadingCSV) {
    return <div>Loading CSV data...</div>;
  }

  if (errorCSV || !processedData) {
    return <div>Error: {errorCSV || 'No data available'}</div>;
  }

  if (!processedData && isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="h-[calc(100vh-200px)] flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (isError || !processedData) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-4 text-center text-red-600">
          Unable to load dashboard data. Please try refreshing.
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="mt-4 mx-auto"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Developer Engagement Dashboard</h1>
          <CohortSelector 
            selectedCohort={selectedCohort}
            onCohortChange={setSelectedCohort}
          />
        </div>

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EngagementAlerts
              alertSummary={data.engagementAlerts}
              onResolveAlert={async (alertId, reason) => {
             
                console.log('Resolving alert:', alertId, reason);
              }}
              onDismissAlert={async (alertId) => {
             
                console.log('Dismissing alert:', alertId);
              }}
            />
            <ExecutiveSummary data={data} />
          </div>
        )}

        {/* Action Items Section */}
        <div className="mb-8">
          <ActionableInsights data={processedData} />
        </div>

        {/* Charts Section - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <EngagementChart data={processedData.engagementTrends} />
          <TechnicalProgressChart
            data={processedData.technicalProgress}
            githubData={{
              inProgress: processedData.issueMetrics[0]?.open || 0,
              done: processedData.issueMetrics[0]?.closed || 0
            }}
          />
        </div>

        {/* Full Width Sections */}
        <div className="space-y-8">
          {/* Tech Partner Overview */}
          <TechPartnerChart data={enhancedTechPartnerData} />

          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <TopPerformersTable data={processedData.topPerformers} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 