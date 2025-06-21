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

const initializeData = async () => {
  if (isInitialized) {
    return;
  }

  try {
    console.log("Initializing AI search data...");
    
    // Check if API key is available
    if (!process.env.VITE_GEMINI_API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY environment variable is not set");
    }

    const csvPath = path.resolve(__dirname, '../data/dataBase.csv');
    const embeddingsPath = path.resolve(__dirname, '../data/embeddings.json');

    const [csvText, embeddingMap] = await Promise.all([
      fs.readFile(csvPath, 'utf-8'),
      fs.readFile(embeddingsPath, 'utf-8').then(JSON.parse)
    ]);

    events = parseCSV(csvText);
    categories = Array.from(new Set(events.map(event => event.event_category).filter(Boolean)));
    
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
        documents.push(new Document({
          pageContent: event.event_description,
          metadata: { id: event.id },
        }));
        vectors.push(embeddingMap[event.id]);
      }
    });

    await vectorStore.addVectors(vectors, documents);
    console.log(`AI search initialized. Loaded ${events.length} events and ${vectors.length} vectors.`);
    isInitialized = true;
  } catch (error) {
    console.error("Failed to initialize AI search:", error);
    throw error;
  }
};

// Fallback text search function (used when AI is not available)
const fallbackSearch = (query, events) => {
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

    const textMatch = words.every(word => searchableText.includes(word));
    const categoryMatch = event.event_category && 
      event.event_category.toLowerCase().includes(searchTerm);
    
    return textMatch || categoryMatch;
  });
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

export default async function handler(req, res) {
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
    // Initialize AI data if not already done
    await initializeData();

    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.json(events);
    }

    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
    
    // Step 1: AI Query Parsing
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are a search query parser for an events website. Your job is to extract a semantic search query and structured filters from a user's input.
      
      The user is searching for events. You must identify:
      1. A 'cost' filter, which can be 'free' or 'paid'. If the user doesn't specify cost, the value should be null.
      2. A 'category' filter from this list: ${categories.join(', ')}. If the user doesn't specify a category, the value should be null.
      3. The rest of the query should be treated as the semantic search term.

      Here are examples:

      Example 1:
      User query: "are there any free hackathons?"
      Response:
      {
        "semanticQuery": "hackathons",
        "filters": {
          "cost": "free",
          "category": "Hackathon"
        }
      }

      Example 2:
      User query: "find me workshops about AI"
      Response:
      {
        "semanticQuery": "workshops about AI",
        "filters": {
          "cost": null,
          "category": "Workshop"
        }
      }

      Example 3:
      User query: "networking events for startups"
      Response:
      {
        "semanticQuery": "networking events for startups",
        "filters": {
          "cost": null,
          "category": "Networking & Community"
        }
      }

      Now, parse the following user query.
      User query: "${query}"
      
      Respond with ONLY the JSON object.
    `;
    
    let parsedQuery;
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedQuery = JSON.parse(jsonString);
    } catch (aiError) {
      console.error("AI parsing failed, using fallback:", aiError);
      // Fallback to simple keyword extraction
      const lowerQuery = query.toLowerCase();
      parsedQuery = {
        semanticQuery: query,
        filters: {
          cost: lowerQuery.includes('free') ? 'free' : lowerQuery.includes('paid') ? 'paid' : null,
          category: null
        }
      };
    }

    // Step 2: Apply filters first
    let filteredEvents = events;
    if (parsedQuery.filters && Object.values(parsedQuery.filters).some(v => v !== null)) {
      filteredEvents = filterEvents(events, parsedQuery.filters);
    }

    // Step 3: Perform semantic search within filtered results
    let searchResults = filteredEvents;
    if (parsedQuery.semanticQuery && vectorStore && filteredEvents.length > 0) {
      try {
        const results = await vectorStore.similaritySearch(parsedQuery.semanticQuery, 20);
        const semanticIds = new Set(results.map(result => result.metadata.id));
        
        // Filter to only include events that are both in the filtered set AND semantically relevant
        searchResults = filteredEvents.filter(event => semanticIds.has(event.id));
        
        // If semantic search returns too few results, fall back to text search
        if (searchResults.length < 5 && filteredEvents.length > 5) {
          const fallbackResults = fallbackSearch(parsedQuery.semanticQuery, filteredEvents);
          if (fallbackResults.length > searchResults.length) {
            searchResults = fallbackResults;
          }
        }
      } catch (semanticError) {
        console.error("Semantic search failed, using text search:", semanticError);
        searchResults = fallbackSearch(parsedQuery.semanticQuery, filteredEvents);
      }
    } else if (parsedQuery.semanticQuery) {
      // If no vector store, use text search
      searchResults = fallbackSearch(parsedQuery.semanticQuery, filteredEvents);
    }

    // Sort by relevance
    if (parsedQuery.semanticQuery && searchResults.length > 1) {
      const searchWords = parsedQuery.semanticQuery.toLowerCase().split(/\s+/);
      searchResults.sort((a, b) => {
        const aText = [
          a.event_name || '',
          a.event_summary || '',
          a.event_description || ''
        ].join(' ').toLowerCase();
        
        const bText = [
          b.event_name || '',
          b.event_summary || '',
          b.event_description || ''
        ].join(' ').toLowerCase();

        const aMatches = searchWords.filter(word => aText.includes(word)).length;
        const bMatches = searchWords.filter(word => bText.includes(word)).length;

        return bMatches - aMatches;
      });
    }

    res.json(searchResults);

  } catch (error) {
    console.error("Search failed:", error);
    res.status(500).json({ 
      error: "Search failed. Please try again.",
      details: error.message 
    });
  }
} 