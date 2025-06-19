import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Filters from './components/Filters';
import EventsByDate from './components/EventsByDate';
import CreateEventModal from './components/CreateEventModal';
import Footer from './components/Footer';
import { parseCSV, Event } from './utils/csvParser';
import CalendarBox from './components/CalendarBox';

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDates, setSelectedDates] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const theme = 'light';

  // Load CSV data on component mount
  useEffect(() => {
    const loadCSVData = async () => {
      try {
        const response = await fetch('/data/18_06_2025.csv');
        const csvText = await response.text();
        const parsedEvents = parseCSV(csvText);
        setEvents(parsedEvents);
        setFilteredEvents(parsedEvents);
      } catch (error) {
        console.error('Error loading CSV data:', error);
        // Fallback to empty array if CSV fails to load
        setEvents([]);
        setFilteredEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadCSVData();
  }, []);

  // Get unique categories from events
  const categories = Array.from(new Set(events.map(event => event.event_category)));

  // Filter events based on category and selected date(s)
  useEffect(() => {
    let filtered = events;

    // Filter out events with invalid dates first
    filtered = filtered.filter(event => {
      if (!event.start_date) return false;
      const dateObj = new Date(event.start_date);
      return !isNaN(dateObj.getTime());
    });

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(event => event.event_category === selectedCategory);
    }

    // Filter by selected date or range
    if (selectedDates.start) {
      const start = selectedDates.start;
      const end = selectedDates.end || selectedDates.start;
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate >= start && eventDate <= end;
      });
    }

    setFilteredEvents(filtered);
  }, [events, selectedCategory, selectedDates]);

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
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <Filters
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={categories}
            compact
          />
          <CalendarBox
            selectedDates={selectedDates}
            setSelectedDates={setSelectedDates}
            compact
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-white px-4 py-2 rounded-lg font-semibold shadow hover:shadow-md transition-all text-sm h-12 min-w-[120px]" style={{ background: 'rgb(114, 78, 153)' }}
          >
            Submit Event
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredEvents.length === events.length ? 'All Events' : 'Filtered Events'}
            </h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
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