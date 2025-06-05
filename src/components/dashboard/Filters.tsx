import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PopoverRoot,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FiltersProps {
  onDateRangeChange: (range: DateRange | undefined) => void;
  onTechPartnerChange: (partners: string[]) => void;
  dateRange: DateRange | undefined;
  selectedPartners: string[];
  availablePartners: string[];
}

export function Filters({
  onDateRangeChange,
  onTechPartnerChange,
  dateRange,
  selectedPartners,
  availablePartners,
}: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const clearFilters = () => {
    onDateRangeChange(undefined);
    onTechPartnerChange([]);
  };

  const togglePartner = (partner: string) => {
    if (selectedPartners.includes(partner)) {
      onTechPartnerChange(selectedPartners.filter((p) => p !== partner));
    } else {
      onTechPartnerChange([...selectedPartners, partner]);
    }
  };

  return (
    <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white/50 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
      <div className="flex flex-wrap gap-3">
        <DateRangePicker
          date={dateRange}
          onDateChange={onDateRangeChange}
          className="min-w-[240px]"
        />

        <PopoverRoot open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 h-9 px-3 text-sm font-medium"
            >
              <Filter className="h-4 w-4" />
              Tech Partners
              {selectedPartners.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 bg-primary/10 text-primary"
                >
                  {selectedPartners.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1">
              {availablePartners.map((partner) => (
                <Button
                  key={partner}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-sm font-normal',
                    selectedPartners.includes(partner) &&
                      'bg-primary/10 text-primary'
                  )}
                  onClick={() => togglePartner(partner)}
                >
                  {partner}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </PopoverRoot>

        {(dateRange || selectedPartners.length > 0) && (
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
