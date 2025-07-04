'use client';

import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange as DayPickerDateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  PopoverRoot,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DateRange } from '@/types/dashboard';

interface DateRangePickerProps {
  date?: DateRange;
  onDateChange: (date: DayPickerDateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <PopoverRoot>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            className="rounded-md border shadow-sm"
            disabled={{ before: new Date(2024, 0, 1) }}
            captionLayout="dropdown"
            fromMonth={new Date(2024, 0)}
            toMonth={new Date(new Date().getFullYear(), new Date().getMonth())}
          />
        </PopoverContent>
      </PopoverRoot>
    </div>
  );
}
