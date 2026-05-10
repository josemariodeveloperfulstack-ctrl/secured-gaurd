"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState<string>("");

  React.useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow only numbers and slashes
    const cleanValue = value.replace(/[^\d/]/g, "");

    // Auto-formatting (dd/mm/yyyy)
    let formattedValue = cleanValue;
    if (cleanValue.length === 2 && !cleanValue.includes("/") && value.length > inputValue.length) {
      formattedValue = cleanValue + "/";
    } else if (cleanValue.length === 5 && cleanValue.split("/").length === 2 && value.length > inputValue.length) {
      formattedValue = cleanValue + "/";
    }

    // Limit length
    if (formattedValue.length <= 10) {
      setInputValue(formattedValue);

      // If it's a complete date, try to parse it
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

  return (
    <Popover>
      <div className="relative w-full">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pr-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow transition-all",
            className
          )}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors h-4 w-4"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-[280px] p-0 bg-seguranca-black border border-gray-700 shadow-2xl z-[10100]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          locale={ptBR}
          className="rounded-md"
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateTimePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Selecione data e hora",
  disabled = false,
  className
}: DateTimePickerProps) {
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
      <DatePicker
        date={selectedDate}
        onDateChange={setSelectedDate}
        placeholder="dd/mm/aaaa"
        disabled={disabled}
        className={className}
      />
      <input
        type="time"
        value={selectedTime}
        onChange={(e) => setSelectedTime(e.target.value)}
        className="w-full px-3 py-2 border border-input bg-background text-sm rounded-md"
        disabled={disabled}
      />
    </div>
  );
}