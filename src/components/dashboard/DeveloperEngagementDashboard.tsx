'use client';

import React, { useEffect, useState } from 'react';
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
import Papa, { ParseResult, ParseConfig, ParseError, Parser } from 'papaparse';
import { processData } from '@/lib/data-processing';
import { EngagementData, ProcessedData } from '@/types/dashboard';
// import CohortSelector from './CohortSelector';
// import { useCohortContext } from '@/context/CohortContext';

// Export processed data for both cohorts
export let processedDataCohort1: ProcessedData | null = null;
export let processedDataCohort2: ProcessedData | null = null;

export default function DeveloperEngagementDashboard() {
  const { data, isLoading, isError, refresh, lastUpdated, isFetching } = useDashboardSystemContext();
  // const { selectedCohort } = useCohortContext();
  const selectedCohort = 'Cohort 1';
  const [csvDataCohort1, setCsvDataCohort1] = useState<EngagementData[]>([]);
  const [csvDataCohort2, setCsvDataCohort2] = useState<EngagementData[]>([]);
  const [isLoadingCSV, setIsLoadingCSV] = useState(true);
  const [errorCSV, setErrorCSV] = useState<string | null>(null);
  const [currentProcessedData, setCurrentProcessedData] = useState<ProcessedData | null>(null);

  async function loadCSVData(cohort: 'cohort-1' | 'cohort-2') {
    try {
      console.log(`Loading CSV data for ${cohort}...`);
      const response = await fetch(`/data/${cohort}/weekly-engagement-data.csv`);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV for ${cohort}: ${response.statusText}`);
      }
      const csvText = await response.text();
      
      Papa.parse<EngagementData>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        complete: (results: ParseResult<EngagementData>) => {
          console.log(`CSV Parse Results for ${cohort}:`, {
            weekRange: results.data.map(d => d['Program Week']),
            totalRows: results.data.length,
            errors: results.errors
          });
          if (cohort === 'cohort-1') {
            setCsvDataCohort1(results.data);
          } else {
            setCsvDataCohort2(results.data);
          }
        },
        error: (error: ParseError): void => {
          console.error(`CSV parsing error for ${cohort}:`, error);
          setErrorCSV(error.message);
        }
      } as ParseConfig<EngagementData>);
    } catch (error) {
      console.error(`Failed to load CSV for ${cohort}:`, error);
      setErrorCSV(error instanceof Error ? error.message : `Failed to load data for ${cohort}`);
    }
  }
  
  useEffect(() => {
    loadCSVData('cohort-1');
    loadCSVData('cohort-2');
  }, []);

  // Process data for cohort 1 and update the exported variable
  useEffect(() => {
    if (csvDataCohort1.length > 0) {
      processedDataCohort1 = processData(csvDataCohort1);
      console.log('Processed data for cohort 1 is ready');
      
      // If this is the currently selected cohort or no cohort is selected, update the state
      if (selectedCohort === 'Cohort 1' || !selectedCohort) {
        setCurrentProcessedData(processedDataCohort1);
      }
      
      // If both cohorts are loaded, we can stop the loading state
      if (csvDataCohort2.length > 0) {
        setIsLoadingCSV(false);
      }
    }
  }, [csvDataCohort1, selectedCohort]);

  // Process data for cohort 2 and update the exported variable
  useEffect(() => {
    if (csvDataCohort2.length > 0) {
      processedDataCohort2 = processData(csvDataCohort2);
      console.log('Processed data for cohort 2 is ready');
      
      // If this is the currently selected cohort, update the state
      if (selectedCohort === 'Cohort 2') {
        setCurrentProcessedData(processedDataCohort2);
      }
      
      // If both cohorts are loaded, we can stop the loading state
      if (csvDataCohort1.length > 0) {
        setIsLoadingCSV(false);
      }
    }
  }, [csvDataCohort2, selectedCohort]);

  // Update current processed data when selected cohort changes
  useEffect(() => {
    console.log(`Cohort selection changed to: ${selectedCohort}`);
    if (selectedCohort === 'Cohort 1' && processedDataCohort1) {
      setCurrentProcessedData(processedDataCohort1);
    } else if (selectedCohort === 'Cohort 2' && processedDataCohort2) {
      setCurrentProcessedData(processedDataCohort2);
    }
  }, [selectedCohort]);

  const enhancedTechPartnerData = React.useMemo(() =>
    currentProcessedData?.techPartnerPerformance && currentProcessedData?.rawEngagementData
      ? enhanceTechPartnerData(currentProcessedData.techPartnerPerformance, currentProcessedData.rawEngagementData)
      : [],
    [currentProcessedData?.techPartnerPerformance, currentProcessedData?.rawEngagementData]
  );

  React.useEffect(() => {
    console.log('Dashboard State:', {
      hasData: !!currentProcessedData,
      selectedCohort,
      metrics: currentProcessedData ? {
        contributors: currentProcessedData.activeContributors,
        techPartners: currentProcessedData.programHealth.activeTechPartners,
        engagementTrends: currentProcessedData.engagementTrends.length,
        technicalProgress: currentProcessedData.technicalProgress.length,
        techPartnerData: enhancedTechPartnerData
      } : null,
      isLoading,
      isError,
      isFetching,
      lastUpdated: new Date(lastUpdated).toISOString()
    });
  }, [currentProcessedData, selectedCohort, isLoading, isError, isFetching, lastUpdated, enhancedTechPartnerData]);

  if (isLoadingCSV) {
    return <div className="container mx-auto p-4">
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <LoadingSpinner />
        <span className="ml-2">Loading cohort data...</span>
      </div>
    </div>;
  }

  if (errorCSV) {
    return <div className="container mx-auto p-4">
      <div className="p-4 text-center text-red-600">
        Error loading data: {errorCSV}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setErrorCSV(null);
            setIsLoadingCSV(true);
            loadCSVData('cohort-1');
            loadCSVData('cohort-2');
          }}
          className="mt-4 mx-auto"
        >
          Retry
        </Button>
      </div>
    </div>;
  }

  // if (!currentProcessedData) {
  //   return <div className="container mx-auto p-4">
  //     <div className="p-4 text-center text-amber-600">
  //       No data available for the selected cohort. Please select a different cohort.
  //       <div className="mt-4">
  //         <CohortSelector />
  //       </div>
  //     </div>
  //   </div>;
  // }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <header className="mb-8 bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">PLDG Developer Engagement</h1>
            <p className="mt-2 text-indigo-100">Real-time insights and engagement metrics</p>
            {/* Insert CohortSelector here */}
            {/* <div className="mt-4">
              <CohortSelector />
            </div> */}
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
        <ExecutiveSummary data={currentProcessedData} />
      </div>

      {/* Action Items Section */}
      <div className="mb-8">
        <ActionableInsights data={currentProcessedData} />
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <EngagementChart data={currentProcessedData.engagementTrends} />
        <TechnicalProgressChart
          data={currentProcessedData.technicalProgress}
          githubData={{
            inProgress: currentProcessedData.issueMetrics[0]?.open || 0,
            done: currentProcessedData.issueMetrics[0]?.closed || 0
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
            <TopPerformersTable data={currentProcessedData.topPerformers} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}