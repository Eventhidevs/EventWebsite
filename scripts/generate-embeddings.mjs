import 'dotenv/config';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-implementing a simple version of the parser here to avoid TS/JS module conflicts.
const parseCSVForScript = (csvText) => {
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

const generateEmbeddings = async () => {
  console.log("Starting embedding generation...");

  // 1. Load and parse the CSV data
  const csvPath = path.resolve(__dirname, '../data/dataBase.csv');
  const csvText = await fs.readFile(csvPath, 'utf-8');
  const events = parseCSVForScript(csvText);
  console.log(`Found ${events.length} total events in CSV.`);

  // 2. Filter for events that have a description
  const eventsWithDescriptions = events.filter(event => 
    event.event_description && event.event_description.trim() !== ''
  );
  console.log(`Found ${eventsWithDescriptions.length} events with descriptions to process.`);

  if (eventsWithDescriptions.length === 0) {
    console.log("No events with descriptions found. Exiting.");
    return;
  }

  // 3. Initialize the embeddings model
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.VITE_GEMINI_API_KEY,
    modelName: "embedding-001",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });

  // 4. Generate embeddings for all descriptions
  const descriptions = eventsWithDescriptions.map(event => event.event_description);
  console.log("Generating embeddings for all descriptions. This may take a moment...");
  const vectors = await embeddings.embedDocuments(descriptions);
  console.log(`Successfully generated ${vectors.length} vectors.`);

  // 5. Create a map of event ID to its vector
  const embeddingMap = {};
  eventsWithDescriptions.forEach((event, index) => {
    embeddingMap[event.id] = vectors[index];
  });

  // 6. Save the map to a JSON file
  const outputPath = path.resolve(__dirname, '../data/embeddings.json');
  await fs.writeFile(outputPath, JSON.stringify(embeddingMap));

  console.log(`Embeddings saved successfully to ${outputPath}`);
};

generateEmbeddings().catch(error => {
  console.error("Failed to generate embeddings:", error);
}); 