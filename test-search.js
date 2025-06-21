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
  return results.data.map((event, index) => ({
    ...event,
    id: `${index}-${event.event_name || ''}`
  }));
};

// Simple text search function (same as in search.js)
const searchEvents = (query, events) => {
  if (!query || !query.trim()) {
    return events;
  }

  const searchTerm = query.toLowerCase().trim();
  const words = searchTerm.split(/\s+/);

  return events.filter(event => {
    const searchableText = [
      event.event_name || '',
      event.event_summary || '',
      event.event_description || '',
      event.event_category || '',
      event.presented_by_name || '',
      event.full_address || '',
      event.region || ''
    ].join(' ').toLowerCase();

    return words.every(word => searchableText.includes(word));
  });
};

// Extract filters from query using simple keyword matching (same as in search.js)
const extractFilters = (query) => {
  const lowerQuery = query.toLowerCase();
  const filters = {};

  if (lowerQuery.includes('free') || lowerQuery.includes('no cost') || lowerQuery.includes('$0')) {
    filters.cost = 'free';
  } else if (lowerQuery.includes('paid') || lowerQuery.includes('cost') || lowerQuery.includes('$')) {
    filters.cost = 'paid';
  }

  const categoryKeywords = {
    'hackathon': 'Hackathon',
    'workshop': 'Workshop',
    'meetup': 'Networking',
    'networking': 'Networking',
    'conference': 'Conference',
    'startup': 'Startup',
    'entrepreneurship': 'Startup',
    'ai': 'AI',
    'machine learning': 'AI',
    'tech': 'Technology',
    'technology': 'Technology'
  };

  for (const [keyword, category] of Object.entries(categoryKeywords)) {
    if (lowerQuery.includes(keyword)) {
      filters.category = category;
      break;
    }
  }

  return filters;
};

// Simple filter function (same as in search.js)
const filterEvents = (events, filters) => {
  return events.filter(event => {
    // Category filter - more flexible matching
    if (filters.category) {
      const eventCategory = (event.event_category || '').toLowerCase();
      const filterCategory = filters.category.toLowerCase();
      
      // Check if the filter category is contained in the event category or vice versa
      if (!eventCategory.includes(filterCategory) && !filterCategory.includes(eventCategory)) {
        return false;
      }
    }

    if (filters.cost === 'free' && event.price_cents > 0) {
      return false;
    }
    if (filters.cost === 'paid' && event.price_cents <= 0) {
      return false;
    }

    return true;
  });
};

async function testSearch() {
  try {
    console.log('Loading events...');
    const csvPath = path.resolve(__dirname, 'data/dataBase.csv');
    const csvText = await fs.readFile(csvPath, 'utf-8');
    const events = parseCSV(csvText);
    console.log(`Loaded ${events.length} events`);

    // Test cases
    const testQueries = [
      'hackathon',
      'free hackathon',
      'AI workshop',
      'networking',
      'startup',
      'free events',
      'paid conference',
      'tech meetup',
      'workshop',
      'AI'
    ];

    console.log('\n=== Search Test Results ===\n');

    for (const query of testQueries) {
      console.log(`Query: "${query}"`);
      
      const filters = extractFilters(query);
      let searchQuery = query;
      
      if (filters.cost === 'free') {
        searchQuery = searchQuery.replace(/\b(free|no cost|\$0)\b/gi, '').trim();
      } else if (filters.cost === 'paid') {
        searchQuery = searchQuery.replace(/\b(paid|cost|\$)\b/gi, '').trim();
      }
      
      if (filters.category) {
        const categoryKeywords = Object.keys({
          'hackathon': 'Hackathon',
          'workshop': 'Workshop',
          'meetup': 'Networking',
          'networking': 'Networking',
          'conference': 'Conference',
          'startup': 'Startup',
          'entrepreneurship': 'Startup',
          'ai': 'AI',
          'machine learning': 'AI',
          'tech': 'Technology',
          'technology': 'Technology'
        });
        
        for (const keyword of categoryKeywords) {
          searchQuery = searchQuery.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '').trim();
        }
      }

      let results = searchEvents(searchQuery, events);
      
      if (Object.keys(filters).length > 0) {
        results = filterEvents(results, filters);
      }

      console.log(`  Filters:`, filters);
      console.log(`  Search term: "${searchQuery}"`);
      console.log(`  Results: ${results.length} events`);
      
      if (results.length > 0) {
        console.log(`  Sample results:`);
        results.slice(0, 3).forEach((event, i) => {
          console.log(`    ${i + 1}. ${event.event_name} (${event.event_category}) - $${event.price_cents / 100}`);
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSearch(); 