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

export function parseCSV(csvText: string): Event[] {
  const lines = csvText.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const event: any = {};
    
    headers.forEach((header, index) => {
      let value = values[index] || '';
      
      // Trim spaces for time fields
      if (header === 'start_time' || header === 'end_time') {
        event[header] = value.trim();
      } else if (header === 'price_cents') {
        event[header] = parseInt(value, 10) || 0;
      } else {
        event[header] = value;
      }
    });
    
    return event as Event;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}