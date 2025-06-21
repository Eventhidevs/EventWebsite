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
    console.log("Initializing search data...");
    
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
    console.log(`Search initialized. Loaded ${events.length} events and ${vectors.length} vectors.`);
    isInitialized = true;
  } catch (error) {
    console.error("Failed to initialize search:", error);
    throw error;
  }
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
    // Initialize data if not already done
    await initializeData();

    const { query } = req.body;

    if (!query) {
      return res.json(events);
    }

    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
    
    // Parse the search query with AI
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

    // Perform semantic search
    let searchResults = [];
    if (parsedQuery.semanticQuery && vectorStore) {
      const results = await vectorStore.similaritySearch(parsedQuery.semanticQuery, 20);
      searchResults = results.map(result => result.metadata.id);
    }

    // Filter the results
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
    res.status(500).json({ 
      error: "Search failed. Please try again.",
      details: error.message 
    });
  }
} 