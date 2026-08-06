"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar, type CalendarRange } from "@/components/ui/calendar";
import {
  RANGE_PRESETS,
  resolvePreset,
  formatRangeLabel,
  startOfDayUtc,
  dayKey,
  type DateRange,
  type RangePreset,
} from "@/lib/dateRange";
import { cn } from "@/lib/utils";

function sameRange(a: DateRange, b: DateRange) {
  return a.fromDay === b.fromDay && a.toDay === b.toDay;
}

export function DateRangePicker({ range }: { range: DateRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const apply = React.useCallback(
    (next: DateRange) => {
      router.push(`${pathname}?from=${next.fromDay}&to=${next.toDay}`);
    },
    [router, pathname]
  );

  const handlePreset = (preset: RangePreset) => {
    apply(resolvePreset(preset));
  };

  const handleCalendar = (selected: CalendarRange | undefined) => {
    if (!selected?.from) return;
    // react-day-picker leaves `to` undefined mid-selection; treat a lone click
    // as a single-day range so the dashboard updates immediately.
    const next: DateRange = {
      fromDay: dayKey(selected.from),
      toDay: dayKey(selected.to ?? selected.from),
    };
    setOpen(false);
    apply(next);
  };

  const calendarSelection: CalendarRange = {
    from: startOfDayUtc(range.fromDay),
    to: startOfDayUtc(range.toDay),
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {RANGE_PRESETS.map((preset) => {
        const isActive = sameRange(range, resolvePreset(preset.value));
        return (
          <Button
            key={preset.value}
            type="button"
            size="sm"
            variant={isActive ? "default" : "outline"}
            data-active={isActive ? "true" : "false"}
            onClick={() => handlePreset(preset.value)}
            className="h-8 rounded-full px-3 text-xs"
          >
            {preset.label}
          </Button>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-2 rounded-full px-3 text-xs"
            />
          }
        >
          <CalendarDays className="size-3.5" />
          <span className={cn("font-medium")}>{formatRangeLabel(range)}</span>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            selected={calendarSelection}
            onSelect={handleCalendar}
            disabled={(date) => date.getTime() > Date.now()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
