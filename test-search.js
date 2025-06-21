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

// Create comprehensive search text for each event (same as in search.js)
const createSearchText = (event) => {
  const price = event.price_cents > 0 ? `$${(event.price_cents / 100).toFixed(2)}` : 'Free';
  const category = event.event_category || '';
  const summary = event.event_summary || '';
  const name = event.event_name || '';
  const description = event.event_description || '';
  
  return `${name} ${summary} ${category} ${price} ${description}`.toLowerCase();
};

// Smart query parsing (same as in search.js)
const parseQuery = (query) => {
  const lowerQuery = query.toLowerCase().trim();
  
  // Extract cost filter
  let cost = null;
  if (lowerQuery.includes('free') || lowerQuery.includes('no cost') || lowerQuery.includes('$0')) {
    cost = 'free';
  } else if (lowerQuery.includes('paid') || lowerQuery.includes('cost') || lowerQuery.includes('$')) {
    cost = 'paid';
  }

  // Extract category filter
  let category = null;
  const categoryKeywords = {
    'hackathon': 'Hackathon',
    'workshop': 'Workshop',
    'meetup': 'Networking & Community',
    'networking': 'Networking & Community',
    'conference': 'Conference',
    'startup': 'Startup & Entrepreneurship',
    'entrepreneurship': 'Startup & Entrepreneurship',
    'ai': 'AI & Machine Learning',
    'machine learning': 'AI & Machine Learning',
    'tech': 'Technology',
    'technology': 'Technology',
    'seminar': 'Seminar',
    'webinar': 'Webinar',
    'panel': 'Panel Discussion',
    'discussion': 'Panel Discussion',
    'lecture': 'Lecture',
    'training': 'Training',
    'course': 'Training'
  };

  for (const [keyword, cat] of Object.entries(categoryKeywords)) {
    if (lowerQuery.includes(keyword)) {
      category = cat;
      break;
    }
  }

  // Clean the search query by removing filter keywords
  let searchQuery = query;
  if (cost === 'free') {
    searchQuery = searchQuery.replace(/\b(free|no cost|\$0)\b/gi, '').trim();
  } else if (cost === 'paid') {
    searchQuery = searchQuery.replace(/\b(paid|cost|\$)\b/gi, '').trim();
  }

  if (category) {
    for (const keyword of Object.keys(categoryKeywords)) {
      searchQuery = searchQuery.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '').trim();
    }
  }

  return {
    semanticQuery: searchQuery,
    filters: { cost, category }
  };
};

// Enhanced text search with comprehensive matching (same as in search.js)
const enhancedTextSearch = (query, events) => {
  if (!query || !query.trim()) {
    return events;
  }

  const searchWords = query.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
  if (searchWords.length === 0) {
    return events;
  }

  const scoredEvents = events.map(event => {
    const searchText = createSearchText(event);
    
    let score = 0;
    let matchedWords = 0;

    for (const word of searchWords) {
      if (searchText.includes(word)) {
        matchedWords++;
        // Boost score for matches in important fields
        if ((event.event_name || '').toLowerCase().includes(word)) score += 15;
        else if ((event.event_summary || '').toLowerCase().includes(word)) score += 10;
        else if ((event.event_category || '').toLowerCase().includes(word)) score += 8;
        else if ((event.price_cents > 0 ? `$${(event.price_cents / 100).toFixed(2)}` : 'free').toLowerCase().includes(word)) score += 5;
        else score += 1;
      }
    }

    // Only return events that match at least one word
    if (matchedWords === 0) {
      return { event, score: 0 };
    }

    // Boost score for exact phrase matches
    if (searchText.includes(query.toLowerCase())) {
      score += 25;
    }

    return { event, score };
  });

  // Filter out non-matching events and sort by score
  return scoredEvents
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.event);
};

// Filter function (same as in search.js)
const filterEvents = (events, filters) => {
  return events.filter(event => {
    // Category filter - more flexible matching
    if (filters.category) {
      const eventCategory = (event.event_category || '').toLowerCase();
      const filterCategory = filters.category.toLowerCase();
      
      if (!eventCategory.includes(filterCategory) && !filterCategory.includes(eventCategory)) {
        return false;
      }
    }

    // Cost filter
    if (filters.cost === 'free' && event.price_cents > 0) {
      return false;
    }
    if (filters.cost === 'paid' && event.price_cents <= 0) {
      return false;
    }

    return true;
  });
};

async function testComprehensiveSearch() {
  try {
    console.log('Loading events for comprehensive search test...');
    const csvPath = path.resolve(__dirname, 'data/dataBase.csv');
    const csvText = await fs.readFile(csvPath, 'utf-8');
    const events = parseCSV(csvText);
    console.log(`Loaded ${events.length} events`);

    // Test cases that focus on the new search capabilities
    const testQueries = [
      'free hackathon',
      'AI workshop',
      'networking events',
      'startup conference',
      'machine learning',
      'entrepreneurship',
      'seminar',
      'webinar',
      'panel discussion',
      'training course',
      'tech meetup',
      'paid events',
      'free events',
      'AI and machine learning',
      'startup networking',
      'hackathon workshop',
      'conference seminar',
      'tech conference',
      'AI training',
      'startup workshop'
    ];

    console.log('\n=== Comprehensive Search Test Results ===\n');

    let totalTime = 0;
    let totalResults = 0;

    for (const query of testQueries) {
      const startTime = Date.now();
      
      // Parse query
      const parsedQuery = parseQuery(query);
      
      // Apply filters first
      let filteredEvents = events;
      if (parsedQuery.filters && Object.values(parsedQuery.filters).some(v => v !== null)) {
        filteredEvents = filterEvents(events, parsedQuery.filters);
      }

      // Perform enhanced text search within filtered results
      let searchResults = filteredEvents;
      if (parsedQuery.semanticQuery && filteredEvents.length > 0) {
        searchResults = enhancedTextSearch(parsedQuery.semanticQuery, filteredEvents);
      }

      const endTime = Date.now();
      const searchTime = endTime - startTime;
      totalTime += searchTime;
      totalResults += searchResults.length;

      console.log(`Query: "${query}"`);
      console.log(`  Parsed:`, parsedQuery);
      console.log(`  Time: ${searchTime}ms`);
      console.log(`  Results: ${searchResults.length} events`);
      
      if (searchResults.length > 0) {
        console.log(`  Sample results:`);
        searchResults.slice(0, 3).forEach((event, i) => {
          const price = event.price_cents > 0 ? `$${(event.price_cents / 100).toFixed(2)}` : 'Free';
          console.log(`    ${i + 1}. ${event.event_name} (${event.event_category}) - ${price}`);
          if (event.event_summary) {
            console.log(`       Summary: ${event.event_summary.substring(0, 100)}...`);
          }
        });
      }
      console.log('');
    }

    const avgTime = totalTime / testQueries.length;
    const avgResults = totalResults / testQueries.length;
    
    console.log('=== Performance Summary ===');
    console.log(`Total queries tested: ${testQueries.length}`);
    console.log(`Average search time: ${avgTime.toFixed(1)}ms`);
    console.log(`Average results per query: ${avgResults.toFixed(1)}`);
    console.log(`Total search time: ${totalTime}ms`);
    console.log(`Performance: ${Math.round(events.length / avgTime)} events/ms`);

    // Test specific search capabilities
    console.log('\n=== Search Capability Tests ===');
    
    // Test price search
    const priceTest = enhancedTextSearch('free', events);
    console.log(`Price search "free": ${priceTest.length} results`);
    
    // Test summary search
    const summaryTest = enhancedTextSearch('workshop', events);
    console.log(`Summary search "workshop": ${summaryTest.length} results`);
    
    // Test category search
    const categoryTest = enhancedTextSearch('hackathon', events);
    console.log(`Category search "hackathon": ${categoryTest.length} results`);
    
    // Test combined search
    const combinedTest = enhancedTextSearch('AI workshop', events);
    console.log(`Combined search "AI workshop": ${combinedTest.length} results`);

  } catch (error) {
    console.error('Comprehensive search test failed:', error);
  }
}

// Run the test
testComprehensiveSearch(); 