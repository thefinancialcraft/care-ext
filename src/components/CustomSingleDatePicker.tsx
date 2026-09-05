"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CustomSingleDatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  onClose?: () => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CustomSingleDatePicker({
  selectedDate,
  onChange,
  onClose
}: CustomSingleDatePickerProps) {
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
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
    onChange(selected);
    if (onClose) onClose();
  };

  const isSelected = (day: number) => {
    return selectedDate === formatDateStr(viewYear, viewMonth, day);
  };

  return (
    <div className="custom-calendar-container" style={{ width: "260px" }}>
      <div className="calendar-header">
        <button type="button" className="cal-nav-btn" onClick={handlePrevMonth}>
          <ChevronLeft size={14} />
        </button>
        <span className="cal-title" style={{ fontSize: "0.8rem" }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button type="button" className="cal-nav-btn" onClick={handleNextMonth}>
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {DAY_NAMES.map(day => (
          <div key={day} className="cal-weekday-cell" style={{ fontSize: "0.7rem" }}>
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
          const selected = isSelected(day);

          let cellClass = "cal-day-cell";
          if (selected) cellClass += " selected-from";

          return (
            <button
              key={day}
              type="button"
              className={cellClass}
              onClick={() => handleDayClick(day)}
              style={{ fontSize: "0.75rem", padding: "0.25rem 0" }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="calendar-footer-actions" style={{ padding: "0.5rem" }}>
        <button
          type="button"
          className="cal-action-btn apply"
          style={{ width: "100%" }}
          onClick={() => onClose && onClose()}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
