'use client';

import { useMemo } from 'react';
import { useDashboardSystemContext } from '@/context/DashboardSystemContext';
import ExecutiveSummary from './ExecutiveSummary';
import { ActionableInsights } from './ActionableInsights';
import EngagementChart from './EngagementChart';
import TechnicalProgressChart from './TechnicalProgressChart';
import TopPerformersTable from './TopPerformersTable';
import { LoadingSpinner } from '../ui/loading';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import { enhanceTechPartnerData } from '@/lib/utils';
import { processData } from '@/lib/data-processing';
import { CohortSelector } from './CohortSelector';
import { CohortId, COHORT_DATA } from '@/types/cohort';
import { useCohortData } from '@/hooks/useCohortData';
import PartnerFeedbackMatrix from './PartnerFeedbackMatrix';
import { Timeline } from './Timeline';
import { TechPartnerChart } from './TechPartnerChart';

export default function DeveloperEngagementDashboard() {
  const {
    isError,
    refresh,
    lastUpdated,
    isFetching,
    selectedCohort,
    setSelectedCohort,
  } = useDashboardSystemContext();

  const {
    data: csvData,
    partnerFeedbackData,
    isLoading: isLoadingCSV,
    error: errorCSV,
  } = useCohortData(selectedCohort);

  const processedData = useMemo(
    () =>
      csvData.length > 0 ? processData(csvData, null, selectedCohort) : null,
    [csvData, selectedCohort]
  );

  const enhancedTechPartnerData = useMemo(
    () =>
      processedData?.techPartnerPerformance && processedData?.rawEngagementData
        ? enhanceTechPartnerData(
            processedData.techPartnerPerformance,
            processedData.rawEngagementData
          )
        : [],
    [processedData?.techPartnerPerformance, processedData?.rawEngagementData]
  );

  const handleCohortChange = (cohortId: CohortId) => {
    setSelectedCohort(cohortId);
  };

  if (isLoadingCSV) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <LoadingSpinner message="Loading CSV data..." />
      </div>
    );
  }

  if (errorCSV || !processedData) {
    return <div>Error: {errorCSV || 'No data available'}</div>;
  }

  if (!processedData && isLoadingCSV) {
    return (
      <div className="container mx-auto p-4">
        <div className="h-[calc(100vh-200px)] flex items-center justify-center">
          <LoadingSpinner message="Loading data..." />
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 md:gap-2">
          <div>
            <h1 className="text-3xl font-bold">PLDG Developer Engagement</h1>
            <p className="mt-2 text-indigo-100">
              {COHORT_DATA[selectedCohort].name} - Real-time insights and
              engagement metrics
            </p>
          </div>
          <div className="flex flex-col justify-start w-full md:w-max lg:flex-row items-center gap-4">
            <div className="flex flex-col lg:flex-row justify-start w-full md:w-max items-center gap-4">
              <CohortSelector
                selectedCohort={selectedCohort}
                onCohortChange={handleCohortChange}
              />
              <span className="text-sm text-indigo-200">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </span>
            </div>

            <div className="flex w-full lg:w-max justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isFetching}
                className="flex items-center gap-1 xl:gap-2 max-lg:py-5 bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
                />
                <p className="w-full text-xs">Refresh Data</p>
              </Button>
            </div>
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

      {/* Partners Feedback Section */}
      <div className="mb-8">
        <PartnerFeedbackMatrix data={partnerFeedbackData} />
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <EngagementChart data={processedData.engagementTrends} />
        <TechnicalProgressChart
          data={processedData.technicalProgress}
          githubData={{
            inProgress: processedData.issueMetrics[0]?.open || 0,
            done: processedData.issueMetrics[0]?.closed || 0,
          }}
        />
      </div>

      <div className="mb-8">
        <Timeline />
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
