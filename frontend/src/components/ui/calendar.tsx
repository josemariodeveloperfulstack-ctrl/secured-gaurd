import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold text-seguranca-lightgray",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100 border-gray-600 text-white hover:bg-seguranca-graphite transition-all duration-200"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell:
          "text-gray-500 rounded-md w-9 font-medium text-[0.75rem] flex-1 text-center uppercase tracking-tighter",
        row: "flex w-full mt-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 transition-all",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-seguranca-yellow/20 hover:text-seguranca-yellow transition-all duration-200 mx-auto rounded-lg"
        ),
        day_range_start: "day-range-start bg-seguranca-yellow text-black !rounded-l-lg font-bold shadow-lg shadow-seguranca-yellow/20",
        day_range_end: "day-range-end bg-seguranca-yellow text-black !rounded-r-lg font-bold shadow-lg shadow-seguranca-yellow/20",
        day_selected:
          "bg-seguranca-yellow text-black hover:bg-seguranca-yellow hover:text-black focus:bg-seguranca-yellow focus:text-black font-semibold shadow-md shadow-seguranca-yellow/25 rounded-lg",
        day_today: "bg-seguranca-graphite text-seguranca-yellow border border-seguranca-yellow/40 font-bold rounded-lg",
        day_outside:
          "day-outside text-gray-600 opacity-40 aria-selected:bg-seguranca-yellow/10 aria-selected:text-gray-500 aria-selected:opacity-30",
        day_disabled: "text-gray-700 opacity-40",
        day_range_middle:
          "aria-selected:bg-seguranca-yellow/15 aria-selected:text-seguranca-yellow !rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
