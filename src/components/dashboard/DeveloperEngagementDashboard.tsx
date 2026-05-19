'use client';

import * as React from 'react';
import { useDashboardSystemContext } from '@/context/DashboardSystemContext';
import ExecutiveSummary from './ExecutiveSummary';
import { ActionableInsights } from './ActionableInsights';
import EngagementChart from './EngagementChart';
import TechnicalProgressChart from './TechnicalProgressChart';
import { TechPartnerChart } from './TechPartnerChart';
import TopPerformersTable from './TopPerformersTable';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import { enhanceTechPartnerData } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { processData } from '@/lib/data-processing';
import { EngagementData } from '@/types/dashboard';
import normalizeEngagementData from '@/lib/formatDBData';

export default function DeveloperEngagementDashboard() {
  const { data, isLoading, isError, refresh, lastUpdated, isFetching } = useDashboardSystemContext();
  const [csvData, setCsvData] = useState<EngagementData[]>([]);
  const [isLoadingCSV, setIsLoadingCSV] = useState(true);
  const [errorCSV, setErrorCSV] = useState<string | null>(null);
  
  

  useEffect(() => {
    async function loadCSVData() {
      try {
        console.log('Loading CSV data...');
        const response = await fetch('/api/cohort');
        if (!response.ok) {
          throw new Error(`Failed to fetch cohort data: ${response.status} ${response.statusText}`);
        }


        const rawData: Record<string, any>[] = await response.json();

         // Normalize each entry
        const cleanedData: EngagementData[] = rawData.map(normalizeEngagementData);
        console.log('CSV Text:', cleanedData);

        setCsvData(cleanedData);
        setIsLoadingCSV(false)
        
      } catch (error) {
        console.error('Failed to load CSV:', error);
        setErrorCSV(error instanceof Error ? error.message : 'Failed to load data');
      }
    }
    loadCSVData();
  }, []);

  const resolvePlatformMetrics = (metrics: any[], platformName: string) => {
    if (!Array.isArray(metrics)) return null;
    return metrics.find((m) => m.platform === platformName) || metrics[0];
  };

  const processedData = csvData.length > 0 ? processData(csvData) : null;
  const targetPlatformMetrics = processedData ? resolvePlatformMetrics(processedData.issueMetrics, 'github') : null;

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

  if (isLoadingCSV && !data) {
    if (!isFetching && !isLoading) {
      return (
        <div className="container mx-auto p-4 max-w-xl mt-12">
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center shadow-sm">
            <h2 className="text-red-800 font-semibold text-lg">Configuration Required</h2>
            <p className="text-red-600 text-sm mt-1 mb-4">
              Dashboard data stream empty. Please verify your local .env configuration setup.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="mx-auto flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4" /> Retry Sync
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center font-medium text-gray-500">
          Loading dashboard telemetry...
        </div>
      </div>
    );
  }

  if (isError || errorCSV || !processedData) {
    return (
      <div className="container mx-auto p-4 max-w-xl mt-12">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center shadow-sm">
          <h2 className="text-red-800 font-semibold text-lg">System Data Incomplete</h2>
          <p className="text-red-600 text-sm mt-1 mb-4">
            {errorCSV || 'Missing system environment configuration.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="mx-auto flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4" /> Retry Connection
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
            inProgress: targetPlatformMetrics?.open || 0,
            done: targetPlatformMetrics?.closed || 0
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