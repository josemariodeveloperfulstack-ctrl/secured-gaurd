"use client";

import * as React from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div className="relative w-full">
      <ReactDatePicker
        selected={date || null}
        onChange={(val: Date | null) => onDateChange?.(val || undefined)}
        dateFormat="dd/MM/yyyy"
        locale={ptBR}
        placeholderText={placeholder}
        disabled={disabled}
        className={cn(
          "w-full pr-10 bg-seguranca-black border border-gray-600 text-seguranca-lightgray text-sm rounded-lg h-10 sm:h-11",
          "focus:outline-none focus:ring-2 focus:ring-seguranca-yellow focus:border-seguranca-yellow",
          "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        wrapperClassName="w-full"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        <CalendarIcon className="h-4 w-4" />
      </div>
    </div>
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
    } else {
      onDateChange?.(selectedDate);
    }
  }, [selectedDate, selectedTime]);

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
        placeholder={placeholder}
        disabled={disabled}
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
          disabled && "opacity-50 cursor-not-allowed"
        )}
        disabled={disabled}
      />
    </div>
  );
}