'use client';

import * as React from 'react';
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
import { EngagementData } from '@/types/dashboard';
import CohortSelector from './CohortSelector';

export default function DeveloperEngagementDashboard() {
  const { data, isLoading, isError, refresh, lastUpdated, isFetching } = useDashboardSystemContext();
  const [csvData, setCsvData] = useState<EngagementData[]>([]);
  const [isLoadingCSV, setIsLoadingCSV] = useState(true);
  const [errorCSV, setErrorCSV] = useState<string | null>(null);

  useEffect(() => {
    async function loadCSVData() {
      try {
        console.log('Loading CSV data...');
        const response = await fetch('/data/Weekly Engagement Survey Breakdown (4).csv');
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        const csvText = await response.text();
        
        Papa.parse<EngagementData>(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          complete: (results: ParseResult<EngagementData>) => {
            console.log('CSV Parse Results:', {
              weekRange: results.data.map(d => d['Program Week']),
              totalRows: results.data.length,
              errors: results.errors
            });
            setCsvData(results.data);
            setIsLoadingCSV(false);
          },
          error: (error: ParseError): void => {
            console.error('CSV parsing error:', error);
            setErrorCSV(error.message);
          }
        } as ParseConfig<EngagementData>);
      } catch (error) {
        console.error('Failed to load CSV:', error);
        setErrorCSV(error instanceof Error ? error.message : 'Failed to load data');
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
      {/* Header Section */}
      <header className="mb-8 bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">PLDG Developer Engagement</h1>
            <p className="mt-2 text-indigo-100">Real-time insights and engagement metrics</p>
            {/* Insert CohortSelector here */}
            <div className="mt-4">
              <CohortSelector />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-indigo-200">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isFetching}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </header>

      {/* Top Section - Executive Summary */}
      <div className="mb-6 bg-white rounded-lg shadow-md">
        <ExecutiveSummary data={processedData} />
      </div>

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
  );
}