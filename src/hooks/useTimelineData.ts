import { useState, useEffect, useMemo } from 'react';
import { useAirtableData } from '@/lib/airtable';
import { useGitHubData } from '@/lib/github';
import { mergeDataForTimeline } from '@/lib/timeline';
import { 
  TimelineEvent, 
  TimelineFilters, 
  TimelineSnapshot,
  DateRange 
} from '@/types/dashboard';
import { format } from 'date-fns';
import { 
  storeTimelineSnapshot, 
  getTimelineSnapshots, 
  deleteTimelineSnapshot 
} from '@/lib/storacha';

export function useTimelineData() {
  const { data: airtableData, isLoading: isAirtableLoading } = useAirtableData();
  const { data: githubData, isLoading: isGithubLoading } = useGitHubData();
  
  const [filters, setFilters] = useState<TimelineFilters>({
    contributors: [],
    cohorts: [],
    eventTypes: ['issue', 'pr', 'survey']
  });
  
  const [savedSnapshots, setSavedSnapshots] = useState<TimelineSnapshot[]>([]);
  
  const allEvents = useMemo(() => {
    return mergeDataForTimeline(githubData, airtableData);
  }, [githubData, airtableData]);
  
  const filteredEvents = useMemo(() => {
    if (!allEvents.length) return [];
    
    return allEvents.filter(event => {
      if (filters.dateRange?.from && filters.dateRange?.to) {
        const eventDate = new Date(event.date);
        if (
          eventDate < filters.dateRange.from ||
          eventDate > filters.dateRange.to
        ) {
          return false;
        }
      }
      
      if (filters.contributors.length > 0 && !filters.contributors.includes(event.contributor)) {
        return false;
      }
      
      if (filters.cohorts.length > 0 && !filters.cohorts.includes(event.cohort)) {
        return false;
      }
      
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) {
        return false;
      }
      
      return true;
    });
  }, [allEvents, filters]);
  
  const filterOptions = useMemo(() => {
    const contributors = new Set<string>();
    const cohorts = new Set<string>();
    
    allEvents.forEach(event => {
      if (event.contributor) contributors.add(event.contributor);
      if (event.cohort) cohorts.add(event.cohort);
    });
    
    return {
      contributors: Array.from(contributors).filter(Boolean).sort(),
      cohorts: Array.from(cohorts).filter(Boolean).sort()
    };
  }, [allEvents]);
  
  const saveSnapshot = async (name: string) => {
    const snapshot: TimelineSnapshot = {
      id: Math.random().toString(36).substring(2, 11),
      name,
      events: filteredEvents,
      filters,
      createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
    };
    
    const success = await storeTimelineSnapshot(snapshot);
    
    if (success) {
      setSavedSnapshots(prev => [...prev, snapshot]);
    }
    
    return snapshot;
  };
  
  useEffect(() => {
    const loadSnapshots = async () => {
      try {
        const snapshots = await getTimelineSnapshots();
        setSavedSnapshots(snapshots);
      } catch (error) {
        console.error('Failed to load timeline snapshots:', error);
      }
    };
    
    loadSnapshots();
  }, []);
  
  const deleteSnapshot = async (id: string) => {
    const success = await deleteTimelineSnapshot(id);
    
    if (success) {
      setSavedSnapshots(prev => prev.filter(snapshot => snapshot.id !== id));
    }
    
    return success;
  };
  
  return {
    events: filteredEvents,
    filters,
    setFilters,
    filterOptions,
    isLoading: isAirtableLoading || isGithubLoading,
    saveSnapshot,
    deleteSnapshot,
    savedSnapshots
  };
} 