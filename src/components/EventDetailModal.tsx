import React, { useRef } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { CalendarEvent } from '../types/calendar';
import { SafeHtmlContent } from '../utils/htmlUtils';

interface EventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose }) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const startDateTime = formatDateTime(event.start);
  const endDateTime = formatDateTime(event.end);

  const addToCalendar = () => {
    const start = new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.description || '')}`;
    
    window.open(calendarUrl, '_blank');
  };

  const modalRef = useRef<HTMLDivElement>(null);
  
  // Close the modal when clicking outside
  useClickOutside(modalRef, onClose);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        ref={modalRef}
        className="bg-[#1a1a2e] bg-opacity-90 backdrop-blur-lg border border-white border-opacity-12 rounded-2xl max-w-md w-full max-h-[80vh] shadow-2xl shadow-[#886FFF]/30 flex flex-col"
      >
        {/* Fixed Header */}
        <div className="flex justify-between items-start p-6 pb-4 border-b border-white border-opacity-10 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white pr-4">{event.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#886FFF] hover:bg-opacity-20 rounded-lg transition-colors duration-200 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <div className="space-y-4">
          <div className="flex items-center gap-3 text-[#886FFF]">
            <Calendar className="w-5 h-5" />
            <div>
              <div className="font-medium">{startDateTime.date}</div>
              {startDateTime.date !== endDateTime.date && (
                <div className="text-sm text-[#c9c9d1]">to {endDateTime.date}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[#886FFF]">
            <Clock className="w-5 h-5" />
            <div>
              <span className="font-medium">{startDateTime.time}</span>
              <span className="text-[#c9c9d1]"> - </span>
              <span className="font-medium">{endDateTime.time}</span>
            </div>
          </div>

          {event.description && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <SafeHtmlContent html={event.description} />
            </div>
          )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 pt-4 border-t border-white border-opacity-10 flex-shrink-0">
          <button
            onClick={addToCalendar}
            className="w-full px-6 py-3 bg-[#886FFF] hover:bg-[#ae7aff] rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Add to My Calendar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;