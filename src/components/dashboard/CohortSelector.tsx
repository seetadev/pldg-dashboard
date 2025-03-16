import React, { useState } from 'react';
import { useCohortContext } from '@/context/CohortContext';

const CohortSelector = () => {
  const { selectedCohort, cohorts, selectCohort } = useCohortContext();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleCohortSelect = (cohort: string) => {
    selectCohort(cohort);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-between w-48 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
      >
        {selectedCohort}
        <svg className="w-5 h-5 ml-2 -mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-48 mt-1 bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden">
          <ul className="py-1 overflow-auto text-base max-h-60 focus:outline-none sm:text-sm">
            {cohorts.map((cohort, index) => (
              <li
                key={cohort}
                onClick={() => handleCohortSelect(cohort)}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                  cohort === selectedCohort 
                    ? 'bg-indigo-700 text-white font-medium' 
                    : 'text-gray-900 hover:bg-indigo-100'
                } ${
                  index === 0 ? 'rounded-t-sm' : ''
                } ${
                  index === cohorts.length - 1 ? 'rounded-b-sm' : ''
                }`}
              >
                {cohort}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CohortSelector;