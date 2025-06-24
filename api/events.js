import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseCSV = (csvText) => {
  const results = Papa.parse(csvText, {
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

  // Helper to convert date+time in IST to UTC ISO string
  function toUTC(date, time) {
    if (!date || !time) return undefined;
    time = time.trim();
    // Try to match 12-hour format (e.g., 8:30 PM)
    let match = time.match(/^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)?$/i);
    let hour, minute;
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
      if (!match) return undefined;
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
    return istDate.toISOString();
  }

  return results.data.map((event, index) => ({
    ...event,
    id: `${index}-${event.event_name || ''}`,
    start_datetime_utc: toUTC(event.start_date, event.start_time),
    end_datetime_utc: toUTC(event.end_date, event.end_time),
  }));
};

// Cache for events data
let eventsCache = null;

const loadEvents = async () => {
  if (eventsCache) {
    return eventsCache;
  }

  try {
    console.log("Loading events data...");
    const csvPath = path.resolve(__dirname, '../data/dataBase.csv');
    const csvText = await fs.readFile(csvPath, 'utf-8');
    eventsCache = parseCSV(csvText);
    console.log(`Loaded ${eventsCache.length} events`);
    return eventsCache;
  } catch (error) {
    console.error("Failed to load events:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const events = await loadEvents();
      res.json(events);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Failed to load events" });
  }
} 