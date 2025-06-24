import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { TaskType } from "@google/generative-ai";
import { Document } from "langchain/document";
import Papa from 'papaparse';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let events = [];
let vectorStore = null;
let categories = [];
let isInitialized = false;
let isInitializing = false;
let searchCache = new Map();
const CACHE_SIZE_LIMIT = 100;

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
    id: `${index}-${event.event_name || ''}`,
    start_datetime_utc: toUTC(event.start_date, event.start_time),
    end_datetime_utc: toUTC(event.end_date, event.end_time),
  }));
};

// Create comprehensive search text for each event
const createSearchText = (event) => {
  const price = event.price_cents > 0 ? `$${(event.price_cents / 100).toFixed(2)}` : 'Free';
  const category = event.event_category || '';
  const summary = event.event_summary || '';
  const name = event.event_name || '';
  const description = event.event_description || '';
  
  return `${name} ${summary} ${category} ${price} ${description}`.toLowerCase();
};

// Check if embeddings need to be regenerated
const shouldRegenerateEmbeddings = async () => {
  try {
    const csvPath = path.resolve(__dirname, 'data/dataBase.csv');
    const embeddingsPath = path.resolve(__dirname, 'data/embeddings.json');
    
    const [csvStats, embeddingsStats] = await Promise.all([
      fs.stat(csvPath),
      fs.stat(embeddingsPath)
    ]);
    
    // Regenerate if CSV is newer than embeddings
    return csvStats.mtime > embeddingsStats.mtime;
  } catch (error) {
    console.log("Embeddings file not found, will generate new ones");
    return true;
  }
};

// Generate embeddings using Gemini-1.5-pro
const generateEmbeddings = async (events) => {
  if (!process.env.VITE_GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY environment variable is not set");
  }

  console.log("Generating embeddings with Gemini-1.5-pro...");
  const startTime = Date.now();
  
  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.VITE_GEMINI_API_KEY,
    modelName: "embedding-001",
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  const embeddingMap = {};
  const batchSize = 10; // Process in batches to avoid rate limits
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const batchPromises = batch.map(async (event) => {
      const searchText = createSearchText(event);
      try {
        const embedding = await embeddings.embedQuery(searchText);
        return { id: event.id, embedding };
      } catch (error) {
        console.error(`Failed to generate embedding for event ${event.id}:`, error);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(result => {
      if (result) {
        embeddingMap[result.id] = result.embedding;
      }
    });
    
    // Progress logging
    const progress = Math.min(i + batchSize, events.length);
    console.log(`Generated embeddings for ${progress}/${events.length} events...`);
  }
  
  // Save embeddings to file
  const embeddingsPath = path.resolve(__dirname, 'data/embeddings.json');
  await fs.writeFile(embeddingsPath, JSON.stringify(embeddingMap, null, 2));
  
  const generationTime = Date.now() - startTime;
  console.log(`Embeddings generated in ${generationTime}ms`);
  
  return embeddingMap;
};

// Load or generate embeddings
const loadEmbeddings = async () => {
  const embeddingsPath = path.resolve(__dirname, 'data/embeddings.json');
  
  try {
    const needsRegeneration = await shouldRegenerateEmbeddings();
    
    if (needsRegeneration) {
      console.log("Dataset changed, regenerating embeddings...");
      return await generateEmbeddings(events);
    } else {
      console.log("Loading existing embeddings...");
      const embeddingData = await fs.readFile(embeddingsPath, 'utf-8');
      return JSON.parse(embeddingData);
    }
  } catch (error) {
    console.log("Failed to load embeddings, generating new ones...");
    return await generateEmbeddings(events);
  }
};

const initializeData = async () => {
  if (isInitialized) {
    return;
  }
  
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  isInitializing = true;
  
  try {
    console.log("Initializing comprehensive search data...");
    
    const csvPath = path.resolve(__dirname, 'data/dataBase.csv');
    const csvText = await fs.readFile(csvPath, 'utf-8');

    events = parseCSV(csvText);
    categories = Array.from(new Set(events.map(event => event.event_category).filter(Boolean)));
    
    console.log(`Loaded ${events.length} events, initializing vector store...`);
    
    // Load or generate embeddings
    const embeddingMap = await loadEmbeddings();
    
    // Initialize vector store
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.VITE_GEMINI_API_KEY,
      modelName: "embedding-001",
      taskType: TaskType.RETRIEVAL_QUERY,
    });

    vectorStore = new MemoryVectorStore(embeddings);

    const documents = [];
    const vectors = [];
    
    events.forEach(event => {
      if (embeddingMap[event.id]) {
        const searchText = createSearchText(event);
        documents.push(new Document({
          pageContent: searchText,
          metadata: { id: event.id },
        }));
        vectors.push(embeddingMap[event.id]);
      }
    });

    await vectorStore.addVectors(vectors, documents);
    
    console.log(`Search initialized. Loaded ${events.length} events and ${vectors.length} vectors.`);
    isInitialized = true;
  } catch (error) {
    console.error("Failed to initialize search:", error);
    isInitializing = false;
    throw error;
  }
  
  isInitializing = false;
};

// Smart query parsing with enhanced filtering
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
    'ai': 'Tech & AI',
    'machine learning': 'Tech & AI',
    'tech': 'Tech & AI',
    'technology': 'Tech & AI',
    'seminar': 'Seminar',
    'webinar': 'Webinar',
    'panel': 'Panel Discussion',
    'discussion': 'Panel Discussion',
    'lecture': 'Lecture',
    'training': 'Training',
    'course': 'Training',
    'education': 'Education & Research',
    'research': 'Education & Research',
    'career': 'Career & Skills',
    'skills': 'Career & Skills',
    'finance': 'Finance & Business',
    'business': 'Finance & Business',
    'marketing': 'Marketing & Branding',
    'branding': 'Marketing & Branding'
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

// Enhanced text search with comprehensive matching
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

// Filter function
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

// Cache management
const getCachedResult = (query) => {
  return searchCache.get(query);
};

const setCachedResult = (query, results) => {
  if (searchCache.size >= CACHE_SIZE_LIMIT) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(query, results);
};

// API Endpoints
app.get('/api/events', async (req, res) => {
  try {
    await initializeData();
    res.json(events);
  } catch (error) {
    console.error("Failed to load events:", error);
    res.status(500).json({ error: "Failed to load events" });
  }
});

app.post('/api/search', async (req, res) => {
  const requestStartTime = Date.now();
  
  try {
    await initializeData();

    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.json(events);
    }

    // Check cache first
    const cachedResult = getCachedResult(query);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // Parse query
    const parsedQuery = parseQuery(query);

    // Apply filters first
    let filteredEvents = events;
    if (parsedQuery.filters && Object.values(parsedQuery.filters).some(v => v !== null)) {
      filteredEvents = filterEvents(events, parsedQuery.filters);
    }

    // Perform semantic search within filtered results
    let searchResults = filteredEvents;
    if (parsedQuery.semanticQuery && vectorStore && filteredEvents.length > 0) {
      try {
        const results = await vectorStore.similaritySearch(parsedQuery.semanticQuery, 20);
        const semanticIds = new Set(results.map(result => result.metadata.id));
        
        // Filter to only include events that are both in the filtered set AND semantically relevant
        searchResults = filteredEvents.filter(event => semanticIds.has(event.id));
        
        // If semantic search returns too few results, fall back to enhanced text search
        if (searchResults.length < 5 && filteredEvents.length > 5) {
          const fallbackResults = enhancedTextSearch(parsedQuery.semanticQuery, filteredEvents);
          if (fallbackResults.length > searchResults.length) {
            searchResults = fallbackResults;
          }
        }
      } catch (semanticError) {
        console.error("Semantic search failed, using enhanced text search:", semanticError);
        searchResults = enhancedTextSearch(parsedQuery.semanticQuery, filteredEvents);
      }
    } else if (parsedQuery.semanticQuery) {
      // If no vector store, use enhanced text search
      searchResults = enhancedTextSearch(parsedQuery.semanticQuery, filteredEvents);
    }

    // Cache the result
    setCachedResult(query, searchResults);

    const responseTime = Date.now() - requestStartTime;
    console.log(`Search "${query}" completed in ${responseTime}ms (results: ${searchResults.length})`);

    res.json(searchResults);

  } catch (error) {
    console.error("Search failed:", error);
    res.status(500).json({ 
      error: "Search failed. Please try again.",
      details: error.message 
    });
  }
});

app.get('/api/test', (req, res) => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };

  res.json({ 
    status: "API is working!",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      hasGeminiKey: !!process.env.VITE_GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      arch: process.arch
    },
    memory: memUsageMB,
    performance: {
      searchCount: 0,
      avgSearchTime: 0,
      cacheSize: searchCache.size,
      isInitialized,
      isInitializing
    }
  });
});

// Start server
initializeData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Optimized development server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/test`);
    console.log(`🔍 Search API: http://localhost:${PORT}/api/search`);
    console.log(`📅 Events API: http://localhost:${PORT}/api/events`);
  });
}).catch(error => {
  console.error("Failed to start server:", error);
  process.exit(1);
}); 