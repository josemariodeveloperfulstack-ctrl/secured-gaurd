"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { EnhancedCalendar } from "@/components/ui/enhanced-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface EnhancedDatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export function EnhancedDatePicker({
  date,
  onDateChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className,
  error = false
}: EnhancedDatePickerProps) {
  const [inputValue, setInputValue] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanValue = value.replace(/[^\d/]/g, "");

    let formattedValue = cleanValue;
    if (cleanValue.length === 2 && !cleanValue.includes("/") && value.length > inputValue.length) {
      formattedValue = cleanValue + "/";
    } else if (cleanValue.length === 5 && cleanValue.split("/").length === 2 && value.length > inputValue.length) {
      formattedValue = cleanValue + "/";
    }

    if (formattedValue.length <= 10) {
      setInputValue(formattedValue);

      if (formattedValue.length === 10) {
        const parsedDate = parse(formattedValue, "dd/MM/yyyy", new Date());
        if (isValid(parsedDate)) {
          onDateChange?.(parsedDate);
        }
      } else if (formattedValue.length === 0) {
        onDateChange?.(undefined);
      }
    }
  };

  const handleCalendarSelect = (selected: Date | undefined) => {
    onDateChange?.(selected);
    if (selected) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pr-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow transition-all",
            error && "border-red-500 text-red-400 focus:ring-red-500 focus:border-red-500",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-seguranca-yellow transition-colors h-4 w-4"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        className="w-auto min-w-[280px] p-0 bg-seguranca-black border border-gray-700 shadow-2xl shadow-black/50 z-[10100] rounded-lg"
        align="start"
        sideOffset={8}
      >
        <EnhancedCalendar
          mode="single"
          selected={date}
          onSelect={handleCalendarSelect}
          initialFocus
          locale={ptBR}
          className="rounded-lg"
        />
      </PopoverContent>
    </Popover>
  );
}

interface EnhancedDateTimePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export function EnhancedDateTimePicker({
  date,
  onDateChange,
  placeholder = "Selecione data e hora",
  disabled = false,
  className,
  error = false
}: EnhancedDateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
  const [selectedTime, setSelectedTime] = React.useState<string>(
    date ? format(date, "HH:mm") : ""
  );

  React.useEffect(() => {
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":");
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0);
      onDateChange?.(newDate);
    }
  }, [selectedDate, selectedTime, onDateChange]);

  React.useEffect(() => {
    setSelectedDate(date);
    if (date) {
      setSelectedTime(format(date, "HH:mm"));
    }
  }, [date]);

  return (
    <div className="space-y-2">
      <EnhancedDatePicker
        date={selectedDate}
        onDateChange={setSelectedDate}
        placeholder="dd/mm/aaaa"
        disabled={disabled}
        error={error}
        className={className}
      />
      <input
        type="time"
        value={selectedTime}
        onChange={(e) => setSelectedTime(e.target.value)}
        className={cn(
          "w-full px-3 py-2 border border-gray-600 bg-seguranca-black text-seguranca-lightgray text-sm rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-seguranca-yellow focus:border-seguranca-yellow",
          "transition-all duration-200",
          error && "border-red-500 text-red-400 focus:ring-red-500 focus:border-red-500",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        disabled={disabled}
      />
    </div>
  );
}
