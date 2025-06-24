import Papa from 'papaparse';

export interface Event {
  id: string;
  event_name: string;
  event_url: string;
  event_summary: string;
  event_description: string;
  full_address: string;
  region: string;
  presented_by_name: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  event_category: string;
  price_cents: number;
  start_datetime_utc?: string;
  end_datetime_utc?: string;
}

export const parseCSV = (csvText: string): Event[] => {
  const results = Papa.parse<Event>(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value, header) => {
      // Ensure price_cents is treated as a number, defaulting to 0
      if (header === 'price_cents') {
        return value === '' || value === null ? 0 : Number(value);
      }
      return value;
    }
  });

  if (results.errors.length) {
    console.error("CSV Parsing Errors:", results.errors);
  }

  // Helper to convert date+time in IST to UTC ISO string
  function toUTC(date: string, time: string): string | undefined {
    if (!date || !time) return undefined;
    time = time.trim();
    // Try to match 12-hour format (e.g., 8:30 PM)
    let match = time.match(/^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)?$/i);
    let hour: number, minute: number;
    if (match) {
      hour = parseInt(match[1], 10);
      minute = parseInt(match[2], 10);
      const part = match[3];
      if (part) {
        if (part.toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (part.toUpperCase() === 'AM' && hour === 12) hour = 0;
      }
    } else {
      // Try to match 24-hour format (e.g., 20:30)
      match = time.match(/^([0-9]{1,2}):([0-9]{2})$/);
      if (!match) {
        console.error('Time format not matched:', { date, time });
        return undefined;
      }
      hour = parseInt(match[1], 10);
      minute = parseInt(match[2], 10);
    }
    const hourStr = hour.toString().padStart(2, '0');
    const minStr = minute.toString().padStart(2, '0');
    const istString = `${date}T${hourStr}:${minStr}:00+05:30`;
    const istDate = new Date(istString);
    if (isNaN(istDate.getTime())) {
      console.error('Invalid IST date:', { date, time, istString });
      return undefined;
    }
    console.log('Parsed IST:', { date, time, istString, iso: istDate.toISOString() });
    return istDate.toISOString();
  }

  return results.data.map((event, index) => ({
    ...event,
    id: `${index}-${event.event_name || ''}`,
    start_datetime_utc: toUTC(event.start_date, event.start_time),
    end_datetime_utc: toUTC(event.end_date, event.end_time),
  }));
};