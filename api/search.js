import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { TaskType } from "@google/generative-ai";
import { Document } from "langchain/document";
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let events = [];
let vectorStore = null;
let categories = [];
let isInitialized = false;
let isInitializing = false;
let searchCache = new Map();
const CACHE_SIZE_LIMIT = 100;

// Performance monitoring
let initStartTime = null;
let searchCount = 0;
let totalSearchTime = 0;

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
    const csvPath = path.resolve(__dirname, '../data/dataBase.csv');
    const embeddingsPath = path.resolve(__dirname, '../data/embeddings.json');
    
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
  const embeddingsPath = path.resolve(__dirname, '../data/embeddings.json');
  await fs.writeFile(embeddingsPath, JSON.stringify(embeddingMap, null, 2));
  
  const generationTime = Date.now() - startTime;
  console.log(`Embeddings generated in ${generationTime}ms`);
  
  return embeddingMap;
};

// Load or generate embeddings
const loadEmbeddings = async () => {
  const embeddingsPath = path.resolve(__dirname, '../data/embeddings.json');
  
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
  initStartTime = Date.now();
  
  try {
    console.log("Initializing comprehensive search data...");
    
    const csvPath = path.resolve(__dirname, '../data/dataBase.csv');
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
    
    const initTime = Date.now() - initStartTime;
    console.log(`Search initialized in ${initTime}ms. Loaded ${events.length} events and ${vectors.length} vectors.`);
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
    'workshop': 'Tech & AI',
    'meetup': 'Networking & Community',
    'networking': 'Networking & Community',
    'conference': 'Tech & AI',
    'startup': 'Startup & Entrepreneurship',
    'entrepreneurship': 'Startup & Entrepreneurship',
    'ai': 'Tech & AI',
    'machine learning': 'Tech & AI',
    'tech': 'Tech & AI',
    'technology': 'Tech & AI',
    'seminar': 'Education & Research',
    'webinar': 'Education & Research',
    'panel': 'Networking & Community',
    'discussion': 'Networking & Community',
    'lecture': 'Education & Research',
    'training': 'Career & Skills',
    'course': 'Education & Research',
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

    // Date filter (if provided)
    if (filters.startDate) {
      const eventDate = new Date(event.start_date);
      const filterDate = new Date(filters.startDate);
      if (eventDate < filterDate) {
        return false;
      }
    }

    if (filters.endDate) {
      const eventDate = new Date(event.start_date);
      const filterDate = new Date(filters.endDate);
      if (eventDate > filterDate) {
        return false;
      }
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

export default async function handler(req, res) {
  const requestStartTime = Date.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize data if not already done (async)
    await initializeData();

    const { query } = req.body;

    if (!query || !query.trim()) {
      const responseTime = Date.now() - requestStartTime;
      console.log(`Empty query response in ${responseTime}ms`);
      return res.json(events);
    }

    // Check cache first
    const cachedResult = getCachedResult(query);
    if (cachedResult) {
      const responseTime = Date.now() - requestStartTime;
      console.log(`Cache hit for "${query}" in ${responseTime}ms, returning ${cachedResult.length} results`);
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
        // Use a dynamic limit based on the number of filtered events, but cap at 50 for performance
        const searchLimit = Math.min(filteredEvents.length, 50);
        console.log(`Searching with limit: ${searchLimit}, filtered events: ${filteredEvents.length}`);
        
        const results = await vectorStore.similaritySearch(parsedQuery.semanticQuery, searchLimit);
        console.log(`Vector store returned ${results.length} results`);
        
        const semanticIds = new Set(results.map(result => result.metadata.id));
        
        // Filter to only include events that are both in the filtered set AND semantically relevant
        searchResults = filteredEvents.filter(event => semanticIds.has(event.id));
        console.log(`After filtering with semantic IDs: ${searchResults.length} results`);
        
        // If semantic search returns too few results, fall back to enhanced text search
        if (searchResults.length < 5 && filteredEvents.length > 5) {
          const fallbackResults = enhancedTextSearch(parsedQuery.semanticQuery, filteredEvents);
          console.log(`Fallback text search returned ${fallbackResults.length} results`);
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

    // Performance tracking
    searchCount++;
    const responseTime = Date.now() - requestStartTime;
    totalSearchTime += responseTime;
    const avgSearchTime = totalSearchTime / searchCount;
    
    // Expose metrics globally for monitoring
    global.searchCount = searchCount;
    global.avgSearchTime = avgSearchTime;
    global.cacheSize = searchCache.size;
    
    console.log(`Search "${query}" completed in ${responseTime}ms (avg: ${avgSearchTime.toFixed(1)}ms, results: ${searchResults.length})`);
    console.log(`Final search results count: ${searchResults.length}`);

    res.json(searchResults);

  } catch (error) {
    const responseTime = Date.now() - requestStartTime;
    console.error(`Search failed in ${responseTime}ms:`, error);
    res.status(500).json({ 
      error: "Search failed. Please try again.",
      details: error.message 
    });
  }
} 