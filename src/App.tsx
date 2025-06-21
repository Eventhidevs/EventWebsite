import React, { useState, useEffect, useMemo } from 'react';
// import Header from './components/Header';
import Hero from './components/Hero';
import Filters, { PricingFilter } from './components/Filters';
import EventsByDate from './components/EventsByDate';
import CreateEventModal from './components/CreateEventModal';
import Footer from './components/Footer';
import { parseCSV, Event } from './utils/csvParser';
import CalendarBox from './components/CalendarBox';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { TaskType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDates, setSelectedDates] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedPricing, setSelectedPricing] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [vectorStore, setVectorStore] = useState<MemoryVectorStore | null>(null);
  const [semanticSearchResults, setSemanticSearchResults] = useState<string[]>([]);
  const theme = 'light';

  useEffect(() => {
    const loadCSVData = async () => {
      try {
        const response = await fetch(`/data/dataBase.csv?timestamp=${new Date().getTime()}`);
        const csvText = await response.text();
        const parsedEvents = parseCSV(csvText);
        setEvents(parsedEvents);

        // Create embeddings and vector store
        if (import.meta.env.VITE_GEMINI_API_KEY) {
          const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: import.meta.env.VITE_GEMINI_API_KEY,
            modelName: "embedding-001",
            taskType: TaskType.RETRIEVAL_QUERY,
          });

          // Filter out events with empty descriptions for vector store
          const eventsWithDescriptions = parsedEvents.filter(event => 
            event.event_description && event.event_description.trim() !== ''
          );
          
          const documents = eventsWithDescriptions.map(event => ({
            pageContent: event.event_description,
            metadata: { id: event.id },
          }));

          try {
            const store = await MemoryVectorStore.fromDocuments(documents, embeddings);
            setVectorStore(store);
          } catch (error) {
            console.error("Error creating vector store:", error);
            setVectorStore(null);
          }
        } else {
          console.error("Gemini API key not found. Please add it to your .env file.");
        }

      } catch (error) {
        console.error('Error loading CSV data:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadCSVData();
  }, []);

  // Get unique categories from events
  const categories = useMemo(() => Array.from(new Set(events.map(event => event.event_category).filter(Boolean))), [events]);

  // AI-powered search query parser
  const parseSearchQueryWithAI = async (query: string) => {
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

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      // Clean up the response to ensure it's valid JSON
      const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonString);

      // Handle cases where the AI might return a string "null" instead of a real null
      if (parsed.filters.cost === "null") parsed.filters.cost = null;
      if (parsed.filters.category === "null") parsed.filters.category = null;

      return parsed;
    } catch (error) {
      console.error("AI query parsing failed:", error);
      // Fallback to basic search if AI fails
      return { semanticQuery: query, filters: { cost: null, category: null } };
    }
  };

  const handleSearch = async () => {
    if (!searchInput) {
      setSearchQuery('');
      setSelectedPricing('');
      setSelectedCategory('');
      setSemanticSearchResults([]);
      return;
    }

    setLoading(true);
    const parsedQuery = await parseSearchQueryWithAI(searchInput);

    // Set filters from AI response
    setSelectedPricing(parsedQuery.filters.cost || '');
    setSelectedCategory(parsedQuery.filters.category || '');
    
    // Use semantic query for vector search
    const semanticQuery = parsedQuery.semanticQuery;
    setSearchQuery(semanticQuery); // This will trigger the useMemo for filtering

    if (!semanticQuery || !vectorStore) {
      setSemanticSearchResults([]);
      setLoading(false);
      return;
    };
    
    try {
      const results = await vectorStore.similaritySearch(semanticQuery, 10);
      const resultIds = results.map((result: any) => result.metadata.id);
      setSemanticSearchResults(resultIds);
    } catch (error) {
      console.error("Semantic search failed:", error);
      setSemanticSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    let baseEvents = events;

    // If there is an active search query, filter by semantic results first.
    // If the search query exists but yields no semantic results, show nothing.
    if (searchQuery) {
      if (semanticSearchResults.length === 0) {
        return [];
      }
      const resultSet = new Set(semanticSearchResults);
      baseEvents = events.filter(event => resultSet.has(event.id));
    }

    // Now, apply the other filters to the base list (either all events or the semantic search results)
    return baseEvents.filter(event => {
      const categoryMatch = selectedCategory ? event.event_category === selectedCategory : true;
      const pricingMatch = (() => {
        if (selectedPricing === 'free') return event.price_cents <= 0;
        if (selectedPricing === 'paid') return event.price_cents > 0;
        return true;
      })();
      const dateMatch = (() => {
        if (!selectedDates.start) return true;
        const eventDate = new Date(event.start_date);
        if (selectedDates.end) {
          return eventDate >= selectedDates.start && eventDate <= selectedDates.end;
        }
        return eventDate.toDateString() === selectedDates.start.toDateString();
      })();
      return categoryMatch && pricingMatch && dateMatch;
    });
  }, [events, selectedCategory, selectedPricing, selectedDates, searchQuery, semanticSearchResults]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* <Header /> */}
      <Hero />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-12">
        <form className="mb-2" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
          <div className="flex">
            <input
              type="text"
              placeholder="Search events..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-4 py-2 sm:py-3 border border-gray-200 rounded-l-2xl focus:ring-2 focus:ring-[#724E99] focus:border-r-0 focus:border-transparent transition-all shadow-lg"
            />
            <button
              type="submit"
              className="bg-[#724E99] text-white font-bold py-2 sm:py-3 px-6 rounded-r-2xl shadow-lg hover:bg-purple-700 transition-all flex items-center"
            >
              Search
            </button>
          </div>
        </form>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
          <div className="flex-1 flex gap-4">
            <div className="flex-[1.5_1_0%]">
              <Filters
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categories={categories}
              />
            </div>
            <div className="flex-1">
              <PricingFilter
                selectedPricing={selectedPricing}
                setSelectedPricing={setSelectedPricing}
              />
            </div>
            <div className="flex-1">
              <CalendarBox
                selectedDates={selectedDates}
                setSelectedDates={setSelectedDates}
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="bg-[#724E99] text-white font-bold py-2 sm:py-3 px-6 rounded-2xl shadow-lg hover:bg-purple-700 transition-all w-full"
            >
              Submit Event
            </button>
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <h2 className="text-base sm:text-2xl font-bold text-gray-900">
              {filteredEvents.length === events.length ? 'All Events' : 'Filtered Events'}
            </h2>
            <span className="bg-[#F3EAFE] text-[#724E99] px-3 py-1 rounded-full text-sm font-medium">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>
        </div>

        <EventsByDate events={filteredEvents} />
      </div>

      <Footer />
      
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default App;