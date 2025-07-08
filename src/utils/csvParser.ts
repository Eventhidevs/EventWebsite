import Papa from 'papaparse';

export interface Event {
  id: string;
  event_name: string;
  event_url: string;
  event_summary: string;
  full_address: string;
  city_state: string;
  presented_by_name: string;
  start_datetime_utc: string;
  end_datetime_utc: string;
  event_category: string;
  price_cents: number;
  event_description: string;
  Event_City: string;
}

export const parseCSV = (csvText: string): Event[] => {
  const results = Papa.parse<Event>(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value, header) => {
      if (header === 'price_cents') {
        return value === '' || value === null ? 0 : Number(value);
      }
      return value;
    }
  });

  if (results.errors.length) {
    console.error("CSV Parsing Errors:", results.errors);
  }

  return results.data.map((event, index) => ({
    ...event,
    id: `${index}-${event.event_name || ''}`,
    start_datetime_utc: event.start_datetime_utc,
    end_datetime_utc: event.end_datetime_utc,
  }));
};