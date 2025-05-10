import * as React from 'react';
import { Calendar, Filter, X, FileText, GitPullRequest, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TimelineFilters } from '@/types/dashboard';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface TimelineFiltersProps {
  filters: TimelineFilters;
  onFiltersChange: (filters: TimelineFilters) => void;
  filterOptions: {
    contributors: string[];
    cohorts: string[];
  };
}

export function TimelineFilterBar({
  filters,
  onFiltersChange,
  filterOptions
}: TimelineFiltersProps) {
  const [contributorsOpen, setContributorsOpen] = React.useState(false);
  const [cohortsOpen, setCohortsOpen] = React.useState(false);
  
  const clearFilters = () => {
    onFiltersChange({
      dateRange: undefined,
      contributors: [],
      cohorts: [],
      eventTypes: ['issue', 'pr', 'survey']
    });
  };
  
  const toggleContributor = (contributor: string) => {
    if (filters.contributors.includes(contributor)) {
      onFiltersChange({
        ...filters,
        contributors: filters.contributors.filter(c => c !== contributor)
      });
    } else {
      onFiltersChange({
        ...filters,
        contributors: [...filters.contributors, contributor]
      });
    }
  };
  
  const toggleCohort = (cohort: string) => {
    if (filters.cohorts.includes(cohort)) {
      onFiltersChange({
        ...filters,
        cohorts: filters.cohorts.filter(c => c !== cohort)
      });
    } else {
      onFiltersChange({
        ...filters,
        cohorts: [...filters.cohorts, cohort]
      });
    }
  };
  
  const toggleEventType = (types: string[]) => {
    onFiltersChange({
      ...filters,
      eventTypes: types as Array<'issue' | 'pr' | 'survey'>
    });
  };
  
  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white/50 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[300px]">
          <DateRangePicker
            date={filters.dateRange}
            onDateChange={(range) => onFiltersChange({ ...filters, dateRange: range })}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="multiple"
            value={filters.eventTypes}
            onValueChange={toggleEventType}
            className="flex gap-1"
          >
            <ToggleGroupItem 
              value="issue" 
              aria-label="Toggle issues" 
              className={cn(
                "px-3 py-2 flex items-center gap-2",
                filters.eventTypes.includes('issue') && "bg-primary/10 text-primary"
              )}
            >
              <FileText className="h-4 w-4" />
              Issues
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="pr" 
              aria-label="Toggle PRs" 
              className={cn(
                "px-3 py-2 flex items-center gap-2",
                filters.eventTypes.includes('pr') && "bg-primary/10 text-primary"
              )}
            >
              <GitPullRequest className="h-4 w-4" />
              PRs
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="survey" 
              aria-label="Toggle surveys" 
              className={cn(
                "px-3 py-2 flex items-center gap-2",
                filters.eventTypes.includes('survey') && "bg-primary/10 text-primary"
              )}
            >
              <ClipboardCheck className="h-4 w-4" />
              Surveys
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        <Popover open={contributorsOpen} onOpenChange={setContributorsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 h-9 px-3 text-sm font-medium"
            >
              <Filter className="h-4 w-4" />
              Contributors
              {filters.contributors.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary">
                  {filters.contributors.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 max-h-[300px] overflow-y-auto" align="start">
            <div className="space-y-1">
              {filterOptions.contributors.map(contributor => (
                <Button
                  key={contributor}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-sm font-normal",
                    filters.contributors.includes(contributor) && "bg-primary/10 text-primary"
                  )}
                  onClick={() => toggleContributor(contributor)}
                >
                  {contributor}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <Popover open={cohortsOpen} onOpenChange={setCohortsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 h-9 px-3 text-sm font-medium"
            >
              <Filter className="h-4 w-4" />
              Cohorts
              {filters.cohorts.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary">
                  {filters.cohorts.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1">
              {['Cohort 0', 'Cohort 1', 'Cohort 2'].map(cohort => (
                <Button
                  key={cohort}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-sm font-normal",
                    filters.cohorts.includes(cohort) && "bg-primary/10 text-primary"
                  )}
                  onClick={() => toggleCohort(cohort)}
                >
                  <div className="flex items-center gap-2 w-full justify-between">
                    <span>{cohort}</span>
                    <Badge variant="secondary" className="text-xs">
                      {cohort === 'Cohort 0' && 'Oct-Dec 2023'}
                      {cohort === 'Cohort 1' && 'Jan-Mar 2024'}
                      {cohort === 'Cohort 2' && 'Apr-Jun 2024'}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {(filters.dateRange || 
          filters.contributors.length > 0 || 
          filters.cohorts.length > 0 ||
          filters.eventTypes.length < 3) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
} 