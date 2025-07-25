export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string;
  htmlLink?: string;
  extendedProperties?: {
    shared?: Record<string, any>;
    private?: Record<string, any>;
    eventType?: string;
  };
}