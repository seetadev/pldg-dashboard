import React, { useState } from 'react';
import { useTimelineData } from '@/hooks/useTimelineData';
import { TimelineFilterBar } from './TimelineFilters';
import { TimelineEvent, TimelineSnapshot } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, BookmarkCheck, Circle, FileText, GitPullRequest, Calendar, Save, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Timeline() {
  const { 
    events, 
    filters, 
    setFilters, 
    filterOptions, 
    isLoading, 
    saveSnapshot,
    savedSnapshots
  } = useTimelineData();
  
  const [snapshotName, setSnapshotName] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  
  const handleSaveSnapshot = () => {
    if (snapshotName) {
      saveSnapshot(snapshotName);
      setSnapshotName('');
      setSaveDialogOpen(false);
    }
  };
  
  const loadSnapshot = (snapshot: TimelineSnapshot) => {
    setFilters(snapshot.filters);
    setActiveTab('timeline');
  };

  const groupedEvents = React.useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    
    events.forEach(event => {
      try {
        const dateStr = event.date;
        if (!dateStr) {
          console.warn('Event missing date:', event);
          return;
        }

        let date: Date;
        if (typeof dateStr === 'string') {
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateStr);
          } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}T/)) {
            date = new Date(dateStr);
          } else {
            const timestamp = Date.parse(dateStr);
            if (isNaN(timestamp)) {
              console.warn('Invalid date format:', dateStr);
              return;
            }
            date = new Date(timestamp);
          }
        } else {
          console.warn('Invalid date type:', typeof dateStr);
          return;
        }

        if (isNaN(date.getTime())) {
          console.warn('Invalid date:', dateStr);
          return;
        }

        const monthYear = format(date, 'MMMM yyyy');
        
        if (!groups[monthYear]) {
          groups[monthYear] = [];
        }
        
        groups[monthYear].push(event);
      } catch (error) {
        console.error('Error processing event:', error, event);
      }
    });
    
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => {
        const dateAObj = new Date(dateA);
        const dateBObj = new Date(dateB);
        return dateBObj.getTime() - dateAObj.getTime();
      });
  }, [events]);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Developer Engagement Timeline</CardTitle>
          <div className="flex gap-2">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save View
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Timeline Snapshot</DialogTitle>
                  <DialogDescription>
                    This will save the current timeline view with all applied filters.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Snapshot name"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                />
                <DialogFooter>
                  <Button onClick={handleSaveSnapshot} disabled={!snapshotName}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <div className="space-y-4">
              <TimelineFilterBar 
                filters={filters} 
                onFiltersChange={setFilters} 
                filterOptions={filterOptions} 
              />
              
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  {events.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No events found with the selected filters.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {groupedEvents.map(([month, monthEvents]) => (
                        <div key={month} className="space-y-2">
                          <h3 className="text-lg font-semibold text-muted-foreground">{month}</h3>
                          <div className="space-y-2">
                            {monthEvents.map(event => (
                              <TimelineItem key={event.id} event={event} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="snapshots">
            {savedSnapshots.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No saved snapshots yet. Create one by filtering the timeline and clicking "Save View".
              </div>
            ) : (
              <div className="space-y-4">
                {savedSnapshots.map(snapshot => (
                  <Card key={snapshot.id} className="overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <h3 className="font-medium">{snapshot.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {snapshot.events.length} events • {format(new Date(snapshot.createdAt), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        onClick={() => loadSnapshot(snapshot)}
                      >
                        <BookmarkCheck className="h-4 w-4 mr-2" />
                        Load
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface TimelineItemProps {
  event: TimelineEvent;
}

export function TimelineItem({ event }: TimelineItemProps) {
  const getStatusColor = () => {
    switch (event.type) {
      case 'issue':
        return 'text-yellow-500';
      case 'pr':
        return 'text-green-500';
      case 'survey':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getIcon = () => {
    switch (event.type) {
      case 'issue':
        return <FileText className={cn("h-4 w-4", getStatusColor())} />;
      case 'pr':
        return <GitPullRequest className={cn("h-4 w-4", getStatusColor())} />;
      case 'survey':
        return <ClipboardCheck className={cn("h-4 w-4", getStatusColor())} />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = () => {
    switch (event.type) {
      case 'issue':
        return 'Issue';
      case 'pr':
        return 'Pull Request';
      case 'survey':
        return 'Survey';
      default:
        return 'Event';
    }
  };

  return (
    <div className="flex gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-lg border shadow-sm">
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-grow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-medium">{event.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn("bg-primary/10", getStatusColor())}>
              {getStatusBadge()}
            </Badge>
            {event.url && (
              <a 
                href={event.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>{format(new Date(event.date), 'PPP')}</span>
          <span>{event.contributor}</span>
          <span>{event.cohort}</span>
        </div>
      </div>
    </div>
  );
} 