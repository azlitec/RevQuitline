'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  availableSlots?: { [key: string]: number }; // e.g., "2025-10-15": 3 slots
  minDate?: Date;
  maxDate?: Date;
}

export function CalendarPicker({
  selectedDate,
  onDateSelect,
  availableSlots = {},
  minDate = new Date(),
  maxDate
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate || new Date()
  );

  // Keep current month view in sync when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate]);

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    
    // Check if date is valid
    if (minDate && date < stripTime(minDate)) return;
    if (maxDate && date > endOfDay(maxDate)) return;

    onDateSelect(date);
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    if (minDate && date < stripTime(minDate)) return true;
    if (maxDate && date > endOfDay(maxDate)) return true;

    const dateStr = date.toISOString().split('T')[0];
    return availableSlots[dateStr] === 0;
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getAvailableSlots = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const dateStr = date.toISOString().split('T')[0];
    return availableSlots[dateStr] || 0;
  };

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const disabled = isDateDisabled(day);
      const selected = isDateSelected(day);
      const today = isToday(day);
      const slots = getAvailableSlots(day);

      days.push(
        <button
          key={day}
          onClick={() => !disabled && handleDateClick(day)}
          disabled={disabled}
          className={`
            aspect-square p-2 rounded-lg flex flex-col items-center justify-center
            transition-all duration-200 touch-friendly relative
            ${disabled 
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
              : 'hover:bg-green-50 active:bg-green-100'
            }
            ${selected 
              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md hover:from-green-700 hover:to-green-800' 
              : 'text-gray-700'
            }
            ${today && !selected 
              ? 'border-2 border-green-500 font-bold' 
              : ''
            }
          `}
        >
          <span className="text-sm md:text-base font-semibold">{day}</span>
          
          {/* Availability indicator dots */}
          {!disabled && !selected && slots > 0 && (
            <div className="flex gap-0.5 mt-1">
              {slots >= 3 ? (
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                </div>
              ) : slots === 2 ? (
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-yellow-500" />
                  <div className="w-1 h-1 rounded-full bg-yellow-500" />
                </div>
              ) : (
                <div className="w-1 h-1 rounded-full bg-red-500" />
              )}
            </div>
          )}

          {/* Today indicator */}
          {today && !selected && (
            <div className="absolute bottom-1 w-1 h-1 rounded-full bg-green-600" />
          )}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-xl p-4 md:p-6 shadow-medium border border-gray-100">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-friendly"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h3 className="text-lg font-bold text-gray-800">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-friendly"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((name) => (
          <div
            key={name}
            className="text-center text-xs font-semibold text-gray-500 py-2"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <span>3+ slots</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
            </div>
            <span>2 slots</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>1 slot left</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-green-500" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}