"use client";

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProcessedData } from '@/types/dashboard';
import { DateRange as ReactDayPickerDateRange } from 'react-day-picker';

interface AISearchProps {
  data: ProcessedData | null;
  onDateRangeChange?: (range: ReactDayPickerDateRange | undefined) => void;
}

export function AISearch({ data, onDateRangeChange }: AISearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim() || !data) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          data
        })
      });

      const { result } = await response.json();
      setResult(result);

      // If the result includes a date range suggestion, update it
      if (result.dateRange && onDateRangeChange) {
        onDateRangeChange(result.dateRange);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResult('Sorry, there was an error processing your search.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium">AI Insights Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Ask about contributors, trends, or specific metrics..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
              className="w-full"
            />
          </div>
          <Button 
            onClick={handleSearch}
            disabled={isSearching}
            className="flex items-center gap-2"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
        </div>
        
        {result && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: result }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 