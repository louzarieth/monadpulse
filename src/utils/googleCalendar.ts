import { CalendarEvent } from '../types/calendar';

const GOOGLE_API_KEY = 'xxxxxxxxxxxxxxxx'; // Replace with your actual API key
const CALENDAR_ID = 'df80381b3317c2ce323ec7376a93dd57fbaa8e733452e576b56ace1656198c31@group.calendar.google.com';

export const fetchGoogleCalendarEvents = async (date: Date): Promise<CalendarEvent[]> => {
  try {
    // Calculate the first and last day of the month in the user's timezone
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    
    // Add buffer days to include events from previous/next month that might appear in the grid
    const bufferDays = 7; // One week buffer to cover all possible days in the grid
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - bufferDays);
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + bufferDays);
    
    // Convert to ISO strings in UTC but preserve the local timezone context
    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?` +
      `key=${GOOGLE_API_KEY}&` +
      `timeMin=${timeMin}&` +
      `timeMax=${timeMax}&` +
      `singleEvents=true&` +
      `orderBy=startTime&` +
      `maxResults=2500`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.items) {
      return [];
    }

    return data.items.map((item: any): CalendarEvent => ({
      id: item.id,
      title: item.summary || 'Untitled Event',
      description: item.description || '',
      start: item.start.dateTime || item.start.date,
      end: item.end.dateTime || item.end.date,
      location: item.location || '',
      htmlLink: item.htmlLink || ''
    }));
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    return [];
  }
};
