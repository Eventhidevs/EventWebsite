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

// --- DATA & MODEL LOADING (at startup) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let events = [];
let vectorStore = null;
let categories = [];
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
let eventsCache = null;

const parseCSV = (csvText) => {
  console.log('parseCSV is running and will add UTC fields');
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
  console.log('Parsing CSV and adding UTC fields');
  return results.data.map((event, index) => ({
    ...event,
    id: `${index}-${event.event_name || ''}`
  }));
};

const loadDataAndVectorStore = async () => {
  try {
    console.log("Loading data and initializing vector store...");
    const csvPath = path.resolve(__dirname, 'data/dataBase.csv');
    const embeddingsPath = path.resolve(__dirname, 'data/embeddings.json');

    const [csvText, embeddingMap] = await Promise.all([
      fs.readFile(csvPath, 'utf-8'),
      fs.readFile(embeddingsPath, 'utf-8').then(JSON.parse)
    ]);

    events = parseCSV(csvText);
    categories = Array.from(new Set(events.map(event => event.event_category).filter(Boolean)));
    
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
    console.log(`Server ready. Loaded ${events.length} events and ${vectors.length} vectors.`);
  } catch (error) {
    console.error("Failed to initialize server data:", error);
    process.exit(1);
  }
};

// --- API ENDPOINTS ---

// Endpoint to get all events initially (unfiltered)
app.get('/api/events', (req, res) => {
  res.json(events);
});

// Endpoint to handle search requests
app.post('/api/search', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.json(events); // Return all events if query is empty
  }

  try {
    // 1. Parse the search query with AI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are a search query parser. Your job is to extract a semantic search query and structured filters from a user's input.
      The user is searching for events.
      You must identify a 'cost' filter, which can be 'free' or 'paid'. If the user doesn't specify cost, the value should be null.
      You must identify a 'category' filter from this list: ${categories.join(', ')}. If the user doesn't specify a category, the value should be null.
      The rest of the query should be treated as the semantic search term.

      Here are two examples of how to respond.

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

      Now, parse the following user query.
      User query: "${query}"
      
      Respond with ONLY the JSON object.
    `;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedQuery = JSON.parse(jsonString);

    // 2. Perform semantic search
    let searchResults = [];
    if (parsedQuery.semanticQuery && vectorStore) {
      const results = await vectorStore.similaritySearch(parsedQuery.semanticQuery, 20);
      searchResults = results.map(result => result.metadata.id);
    }

    // 3. Filter the results
    const resultSet = new Set(searchResults);
    const filteredEvents = events.filter(event => {
      const semanticMatch = parsedQuery.semanticQuery ? resultSet.has(event.id) : true;
      const costMatch = (() => {
        if (parsedQuery.filters.cost === 'free') return event.price_cents <= 0;
        if (parsedQuery.filters.cost === 'paid') return event.price_cents > 0;
        return true;
      })();
      const categoryMatch = parsedQuery.filters.category ? event.event_category === parsedQuery.filters.category : true;
      
      return semanticMatch && costMatch && categoryMatch;
    });

    res.json(filteredEvents);

  } catch (error) {
    console.error("Search failed:", error);
    res.status(500).json({ error: "Search failed. Please try again." });
  }
});

const loadEvents = async () => {
  // REMOVE or comment out the cache for development:
  // if (eventsCache) {
  //   return eventsCache;
  // }

  try {
    console.log("Loading events data...");
    const csvPath = path.resolve(__dirname, '../data/dataBase.csv');
    const csvText = await fs.readFile(csvPath, 'utf-8');
    // REMOVE the cache assignment for development:
    // eventsCache = parseCSV(csvText);
    // return eventsCache;
    return parseCSV(csvText);
  } catch (error) {
    console.error("Failed to load events:", error);
    throw error;
  }
};

loadDataAndVectorStore().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});

function toUTC(date, time) {
  if (!date || !time) return undefined;
  time = time.trim();
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