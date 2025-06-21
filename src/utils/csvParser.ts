import Papa from 'papaparse';

export interface Event {
  event_name: string;
  event_url: string;
  event_summary: string;
  full_address: string;
  region: string;
  presented_by_name: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  event_category: string;
  price_cents: number;
}

export const parseCSV = (csvText: string): Event[] => {
  const results = Papa.parse<Event>(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
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

  return results.data;
};