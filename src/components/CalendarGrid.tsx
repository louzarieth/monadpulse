import React from 'react';
import { CalendarEvent } from '../types/calendar';

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  loading: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  events,
  loading,
  onEventClick,
  onDayClick
}) => {
  const today = new Date();
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  // Adjust to start on Monday (1) instead of Sunday (0)
  const dayOfWeek = firstDayOfMonth.getDay() || 7; // Convert Sunday (0) to 7
  startDate.setDate(startDate.getDate() - (dayOfWeek - 1));
  
  // Always calculate end date to complete the last week (ending on Sunday)
  const endDate = new Date(lastDayOfMonth);
  // Find the next Sunday (day 0)
  const remainingDays = (7 - (lastDayOfMonth.getDay() || 7)) % 7;
  endDate.setDate(endDate.getDate() + remainingDays);

  const days = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      // Check if the event date matches the current date (ignoring time)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#886FFF]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a2e] bg-opacity-50 rounded-2xl p-6 backdrop-blur-sm border border-white border-opacity-10">
      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-4 mb-4">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-[#c9c9d1] font-medium py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-4">
        {days.map((date, index) => {
          const dayEvents = getEventsForDay(date);
          const visibleEvents = dayEvents.slice(0, 2);
          const hasMoreEvents = dayEvents.length > 2;

          return (
            <div
              key={index}
              className={`h-32 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#886FFF] hover:bg-opacity-10 border border-transparent hover:border-[#886FFF] hover:border-opacity-30 ${
                !isCurrentMonth(date) ? 'opacity-40' : ''
              }`}
              onClick={() => onDayClick(date)}
            >
              <div className={`text-sm font-medium mb-2 ${
                isToday(date) 
                  ? 'bg-[#886FFF] text-white rounded-full w-6 h-6 flex items-center justify-center' 
                  : ''
              }`}>
                {date.getDate()}
              </div>
              
              <div className="space-y-1">
                {visibleEvents.map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className="text-xs p-1 bg-[#886FFF] bg-opacity-20 rounded truncate hover:bg-opacity-30 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                
                {hasMoreEvents && (
                  <div className="text-xs text-[#886FFF] font-medium">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;