import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Filters, { PricingFilter } from './components/Filters';
import EventsByDate from './components/EventsByDate';
import CreateEventModal from './components/CreateEventModal';
import Footer from './components/Footer';
import { parseCSV, Event } from './utils/csvParser';
import CalendarBox from './components/CalendarBox';

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDates, setSelectedDates] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedPricing, setSelectedPricing] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const theme = 'light';

  // Load CSV data on component mount
  useEffect(() => {
    const loadCSVData = async () => {
      try {
        const response = await fetch('/data/dataBase.csv');
        const csvText = await response.text();
        const parsedEvents = parseCSV(csvText);
        setEvents(parsedEvents);
      } catch (error) {
        console.error('Error loading CSV data:', error);
        // Fallback to empty array if CSV fails to load
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadCSVData();
  }, []);

  // Get unique categories from events
  const categories = useMemo(() => Array.from(new Set(events.map(event => event.event_category))), [events]);

  // Filter events based on category and selected date(s)
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
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
      const searchMatch = searchQuery ? event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      return categoryMatch && pricingMatch && dateMatch && searchMatch;
    });
  }, [events, selectedCategory, selectedPricing, selectedDates, searchQuery]);

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
      <Header />
      <Hero />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-12">
        <form className="mb-2" onSubmit={(e) => { e.preventDefault(); setSearchQuery(searchInput); }}>
          <div className="flex">
            <input
              type="text"
              placeholder="Search events by name..."
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
              onClick={() => document.querySelector('form')?.requestSubmit()}
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