"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type CalendarRange = { from?: Date; to?: Date }

export function Calendar({
  selected,
  onSelect,
  numberOfMonths = 2,
  disabled,
  className,
}: {
  selected?: CalendarRange
  onSelect: (range: CalendarRange | undefined) => void
  numberOfMonths?: number
  disabled?: (date: Date) => boolean
  className?: string
}) {
  return (
    <DayPicker
      mode="range"
      selected={selected as never}
      onSelect={onSelect as never}
      numberOfMonths={numberOfMonths}
      defaultMonth={selected?.from}
      disabled={disabled}
      showOutsideDays
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-2 top-2 inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        button_next:
          "absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "size-9 p-0 text-center text-sm",
        day_button:
          "size-9 rounded-lg font-normal transition-colors hover:bg-muted aria-selected:opacity-100",
        selected: "bg-primary text-primary-foreground hover:bg-primary",
        range_start: "rounded-l-lg bg-primary text-primary-foreground",
        range_end: "rounded-r-lg bg-primary text-primary-foreground",
        range_middle: "bg-primary/15 text-foreground",
        today: "font-semibold text-primary",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30 pointer-events-none",
        hidden: "invisible",
      }}
    />
  )
}
