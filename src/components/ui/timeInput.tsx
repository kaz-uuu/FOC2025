"use client";
 
import * as React from "react";
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { TimePickerInput } from "./time-picker-input";
 
interface TimePickerDemoProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}
 
export function TimeInput({ date, setDate }: TimePickerDemoProps) {
  const [timeInput, setTimeInput] = React.useState<string>("");

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeInput(value);

    // Validate the time format: minutes:seconds.100ths of a second
    const timeRegex = /^(\d{1,2}):(\d{2})\.(\d{2})$/;
    const match = value.match(timeRegex);

    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const hundredths = parseInt(match[3], 10);

      if (minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60 && hundredths >= 0 && hundredths < 100) {
        const newDate = new Date(date || new Date());
        newDate.setMinutes(minutes);
        newDate.setSeconds(seconds);
        newDate.setMilliseconds(hundredths * 10);
        setDate(newDate);
        console.log(newDate)
      }
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="grid gap-1 text-center">
        <Label htmlFor="time" className="text-xs">
          Time (MM:SS.99)
        </Label>
        <input
          id="time"
          type="text"
          value={timeInput}
          onChange={handleTimeChange}
          placeholder="00:00.00"
          className="border rounded p-2"
        />
      </div>
    </div>
  );
}