"use client";

import * as React from 'react';
import { useContext, useState } from 'react';

interface CohortContextType {
  selectedCohort: string;
  cohorts: string[];
  selectCohort: (cohort: string) => void;
}

const CohortContext = React.createContext<CohortContextType | undefined>(undefined);

export function CohortProvider({ children }: { children: React.ReactNode }) {
  const mockCohorts = ['Cohort 1', 'Cohort 2', 'Cohort 3'];
  
  const [selectedCohort, setSelectedCohort] = useState<string>(mockCohorts[0]);
  
  const selectCohort = (cohort: string) => {
    setSelectedCohort(cohort);
  };
  
  const value = {
    selectedCohort,
    cohorts: mockCohorts,
    selectCohort
  };
  
  return (
    <CohortContext.Provider value={value}>
      {children}
    </CohortContext.Provider>
  );
}

export function useCohortContext() {
  const context = useContext(CohortContext);
  if (!context) {
    throw new Error('useCohortContext must be used within a CohortProvider');
  }
  return context;
}