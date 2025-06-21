import React, { useState, useEffect, useMemo } from 'react';
// import Header from './components/Header';
import Hero from './components/Hero';
import Filters, { PricingFilter } from './components/Filters';
import EventsByDate from './components/EventsByDate';
import CreateEventModal from './components/CreateEventModal';
import Footer from './components/Footer';
import { Event } from './utils/csvParser';
import CalendarBox from './components/CalendarBox';

const API_URL = '/api';

function App() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDates, setSelectedDates] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedPricing, setSelectedPricing] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch all events on initial load
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const response = await fetch(`${API_URL}/events`);
        const data = await response.json();
        setAllEvents(data);
        setFilteredEvents(data); // Initially, show all events
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllEvents();
  }, []);

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      setFilteredEvents(allEvents); // Reset to all events if search is cleared
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchInput }),
      });
      const data = await response.json();
      setFilteredEvents(data);
    } catch (error) {
      console.error("Search request failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => Array.from(new Set(allEvents.map(event => event.event_category).filter(Boolean))), [allEvents]);

  // This effect will re-filter events locally when dropdown filters change
  useEffect(() => {
    let eventsToFilter = allEvents;

    // Note: The main text search is now handled by the server.
    // This local filtering is for the dropdowns only.
    // A more advanced implementation might make a server request for every filter change.
    
    const locallyFiltered = eventsToFilter.filter(event => {
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
    
    // If a search query is active, we show the results from the server.
    // Otherwise, we show the locally filtered results.
    if (!searchInput.trim()) {
      setFilteredEvents(locallyFiltered);
    }

  }, [selectedCategory, selectedPricing, selectedDates, allEvents, searchInput]);

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
              {filteredEvents.length === allEvents.length ? 'All Events' : 'Filtered Events'}
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