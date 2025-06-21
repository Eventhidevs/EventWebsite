import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TaskType } from "@google/generative-ai";
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

// Create comprehensive search text for each event
const createSearchText = (event) => {
  const price = event.price_cents > 0 ? `$${(event.price_cents / 100).toFixed(2)}` : 'Free';
  const category = event.event_category || '';
  const summary = event.event_summary || '';
  const name = event.event_name || '';
  const description = event.event_description || '';
  
  return `${name} ${summary} ${category} ${price} ${description}`.toLowerCase();
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
  console.log(`Saved ${Object.keys(embeddingMap).length} embeddings to ${embeddingsPath}`);
  
  return embeddingMap;
};

async function main() {
  try {
    console.log('Loading events...');
    const csvPath = path.resolve(__dirname, '../data/dataBase.csv');
    const csvText = await fs.readFile(csvPath, 'utf-8');
    const events = parseCSV(csvText);
    console.log(`Loaded ${events.length} events`);

    await generateEmbeddings(events);
    console.log('Embedding generation completed successfully!');
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    process.exit(1);
  }
}

main(); 