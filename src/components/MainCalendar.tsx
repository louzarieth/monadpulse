import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, Calendar, Twitter } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import EventDetailModal from './EventDetailModal';
import DayEventsModal from './DayEventsModal';
import BulkSettingsModal from './BulkSettingsModal';
import { fetchGoogleCalendarEvents } from '../utils/googleCalendar';
import { CalendarEvent } from '../types/calendar';

const MainCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem('monad-pulse-visited');
    if (!hasVisited) {
      setIsFirstTime(true);
      localStorage.setItem('monad-pulse-visited', 'true');
      setTimeout(() => {
        setShowSettings(true);
      }, 2000);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const calendarEvents = await fetchGoogleCalendarEvents(currentDate);
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
      // Optionally show an error message to the user
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 md:mb-6 gap-4 w-full">
        <div className="flex items-center gap-4">
          
		  <button
            onClick={goToPreviousMonth}
            className="p-3 hover:bg-[#886FFF] hover:bg-opacity-20 rounded-lg transition-colors duration-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
          
          <button
            onClick={goToNextMonth}
            className="p-3 hover:bg-[#886FFF] hover:bg-opacity-20 rounded-lg transition-colors duration-200"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-6 py-3 bg-[#886FFF] hover:bg-[#ae7aff] rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Today
          </button>
          <a
            href="https://x.com/monad_pulse"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <Twitter className="w-4 h-4" />
            Get Twitter Reminders
          </a>
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-3 hover:bg-[#886FFF] hover:bg-opacity-20 rounded-lg transition-colors duration-200"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <CalendarGrid
        currentDate={currentDate}
        events={events}
        loading={loading}
        onEventClick={handleEventClick}
        onDayClick={handleDayClick}
      />

      {/* Modals */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {selectedDay && (
        <DayEventsModal
          date={selectedDay}
          events={events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.toDateString() === selectedDay.toDateString();
          })}
          onClose={() => setSelectedDay(null)}
          onEventClick={handleEventClick}
        />
      )}

      {showSettings && (
        <BulkSettingsModal
          onClose={() => setShowSettings(false)}
          events={events}
          isFirstTime={isFirstTime}
        />
      )}
    </div>
  );
};

export default MainCalendar;