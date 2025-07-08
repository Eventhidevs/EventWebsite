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

  // Debug: log the keys of the first event
  if (results.data.length > 0) {
    console.log('First event keys:', Object.keys(results.data[0]));
  }

  return results.data.map((event, index) => {
    return {
      ...event,
      id: `${index}-${event.event_name || ''}`,
      start_datetime_utc: event.start_datetime_utc || null,
      end_datetime_utc: event.end_datetime_utc || null,
    };
  });
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