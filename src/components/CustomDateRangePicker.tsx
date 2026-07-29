"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CustomDateRangePickerProps {
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
  onClose?: () => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CustomDateRangePicker({
  fromDate,
  toDate,
  onChange,
  onClose
}: CustomDateRangePickerProps) {
  const initialDate = fromDate ? new Date(fromDate) : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  const formatDateStr = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const handleDayClick = (day: number) => {
    const selected = formatDateStr(viewYear, viewMonth, day);

    if (!fromDate || (fromDate && toDate)) {
      onChange(selected, "");
    } else if (fromDate && !toDate) {
      if (selected < fromDate) {
        onChange(selected, "");
      } else {
        onChange(fromDate, selected);
      }
    }
  };

  const isSelectedFrom = (day: number) => {
    return fromDate === formatDateStr(viewYear, viewMonth, day);
  };

  const isSelectedTo = (day: number) => {
    return toDate === formatDateStr(viewYear, viewMonth, day);
  };

  const isInRange = (day: number) => {
    if (!fromDate || !toDate) return false;
    const current = formatDateStr(viewYear, viewMonth, day);
    return current > fromDate && current < toDate;
  };

  return (
    <div className="custom-calendar-container">
      <div className="calendar-header">
        <button type="button" className="cal-nav-btn" onClick={handlePrevMonth}>
          <ChevronLeft size={16} />
        </button>
        <span className="cal-title">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button type="button" className="cal-nav-btn" onClick={handleNextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {DAY_NAMES.map(day => (
          <div key={day} className="cal-weekday-cell">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-days-grid">
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="cal-day-cell empty" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const from = isSelectedFrom(day);
          const to = isSelectedTo(day);
          const range = isInRange(day);

          let cellClass = "cal-day-cell";
          if (from) cellClass += " selected-from";
          if (to) cellClass += " selected-to";
          if (range) cellClass += " in-range";

          return (
            <button
              key={day}
              type="button"
              className={cellClass}
              onClick={() => handleDayClick(day)}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="calendar-selection-summary">
        <div>
          <span>FROM: </span>
          <strong>{fromDate || "Select Start"}</strong>
        </div>
        <div>
          <span>TO: </span>
          <strong>{toDate || "Select End"}</strong>
        </div>
      </div>

      <div className="calendar-footer-actions">
        <button
          type="button"
          className="cal-action-btn clear"
          onClick={() => onChange("", "")}
        >
          CLEAR
        </button>
        <button
          type="button"
          className="cal-action-btn apply"
          onClick={() => onClose && onClose()}
        >
          DONE
        </button>
      </div>
    </div>
  );
}
