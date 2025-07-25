import React, { useRef } from 'react';
import { X, Clock } from 'lucide-react';
import { CalendarEvent } from '../types/calendar';
import { SafeHtmlContent } from '../utils/htmlUtils';
import { useClickOutside } from '../hooks/useClickOutside';

interface DayEventsModalProps {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onEventClick: (event: CalendarEvent) => void;
}

const DayEventsModal: React.FC<DayEventsModalProps> = ({ 
  date, 
  events, 
  onClose, 
  onEventClick 
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
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
          <h2 className="text-2xl font-bold text-white pr-4">{formatDate(date)}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#886FFF] hover:bg-opacity-20 rounded-lg transition-colors duration-200 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {events.length === 0 ? (
            <div className="text-center text-[#c9c9d1] py-8">
              No events scheduled for this day.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={index}
                  className="p-4 bg-[#886FFF] bg-opacity-10 rounded-lg cursor-pointer hover:bg-opacity-20 transition-colors duration-200 border border-[#886FFF] border-opacity-20"
                  onClick={() => {
                    onClose();
                    onEventClick(event);
                  }}
                >
                  <h3 className="font-semibold text-white mb-2 break-words whitespace-normal">{event.title}</h3>
                  <div className="flex items-center gap-2 text-[#886FFF] text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
                  </div>
                  {event.description && (
                    <div className="text-[#c9c9d1] text-sm mt-2 line-clamp-2">
                      <SafeHtmlContent 
                        html={event.description} 
                        className="text-[#c9c9d1] text-sm line-clamp-2"
                        maxHeight=""
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayEventsModal;