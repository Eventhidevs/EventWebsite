import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import Header from './components/Header';
import Hero from './components/Hero';
import Filters, { PricingFilter } from './components/Filters';
import EventsByDate from './components/EventsByDate';
import CreateEventModal from './components/CreateEventModal';
import Footer from './components/Footer';
import { Event } from './utils/csvParser';
import CalendarBox from './components/CalendarBox';
import TimeOfDayFilter from './components/TimeOfDayFilter';
import FilterModal from './components/FilterModal';
import { SlidersHorizontal } from 'lucide-react';

const API_URL = '/api';

function isEventInTimeSlot(event: Event, slot: string) {
  if (!event.start_time) return false;
  // Parse start_time (assume format like '09:30 PM' or '12:30 AM')
  let [time, meridian] = event.start_time.split(' ');
  let [hour, min] = time.split(':').map(Number);
  if (meridian && meridian.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (meridian && meridian.toUpperCase() === 'AM' && hour === 12) hour = 0;
  
  const startMinutes = hour * 60 + min;

  switch (slot) {
    case "before6":
      return startMinutes < 360; // before 6:00 am
    case "morning":
      return startMinutes >= 360 && startMinutes < 720; // 6:00 am - 12:00 pm
    case "afternoon":
      return startMinutes >= 720 && startMinutes < 1080; // 12:00 pm - 6:00 pm
    case "after6":
      return startMinutes >= 1080; // after 6:00 pm
    default:
      return true;
  }
}

function App() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [baseEvents, setBaseEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDates, setSelectedDates] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedPricing, setSelectedPricing] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [initializationStatus, setInitializationStatus] = useState<string>('Loading events...');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');

  const locations = useMemo(() => {
    const locs = Array.from(new Set(allEvents.map(event => event.region).filter(Boolean)));
    if (!locs.includes('Dubai')) locs.push('Dubai');
    return locs;
  }, [allEvents]);

  // Fetch all events on initial load
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        setInitializationStatus('Loading events...');
        const response = await fetch(`${API_URL}/events`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }
        
        const data = await response.json();
        setAllEvents(data);
        setBaseEvents(data);
        setFilteredEvents(data); // Initially, show all events
        setInitializationStatus('Events loaded successfully!');
      } catch (error) {
        console.error("Failed to fetch events:", error);
        setInitializationStatus('Failed to load events. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllEvents();
  }, []);

  // Debounced search function with better error handling
  const debouncedSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setBaseEvents(allEvents);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`${API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      setBaseEvents(data);
    } catch (error) {
      console.error("Search request failed:", error);
      // Fallback to local search on error
      const localResults = allEvents.filter(event => {
        const searchableText = [
          event.event_name || '',
          event.event_summary || '',
          event.event_description || '',
          event.event_category || '',
          event.presented_by_name || '',
          event.full_address || '',
          event.region || '',
          event.price_cents > 0 ? `$${(event.price_cents / 100).toFixed(2)}` : 'Free'
        ].join(' ').toLowerCase();
        
        return searchableText.includes(query.toLowerCase());
      });
      setBaseEvents(localResults);
    } finally {
      setSearchLoading(false);
    }
  }, [allEvents]);

  // Handle search input changes with debouncing
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      debouncedSearch(value);
    }, 300);
    
    setSearchTimeout(timeout);
  }, [debouncedSearch, searchTimeout]);

  // Manual search function (for form submission)
  const handleSearch = useCallback(async () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    await debouncedSearch(searchInput);
  }, [searchInput, debouncedSearch, searchTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const categories = useMemo(() => Array.from(new Set(allEvents.map(event => event.event_category).filter(Boolean))), [allEvents]);

  // This effect will re-filter events locally when dropdown filters change or baseEvents changes
  useEffect(() => {
    let eventsToFilter = baseEvents;

    const locallyFiltered = eventsToFilter.filter(event => {
      const categoryMatch = selectedCategory ? event.event_category === selectedCategory : true;
      const locationMatch = selectedLocation ? event.region === selectedLocation : true;
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
      const timeOfDayMatch = selectedTimeOfDay ? isEventInTimeSlot(event, selectedTimeOfDay) : true;

      return categoryMatch && locationMatch && pricingMatch && dateMatch && timeOfDayMatch;
    });
    
    setFilteredEvents(locallyFiltered);
  }, [selectedCategory, selectedLocation, selectedPricing, selectedDates, selectedTimeOfDay, baseEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">{initializationStatus}</p>
          <p className="text-sm text-gray-500">
            {initializationStatus.includes('Loading') && 'This may take a moment on first load as we prepare the search system...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* <Header /> */}
      <div className="relative">
        <Hero />
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-12">
        {/* Desktop: search/filter row, then tips row. Mobile: stacked order. */}
        {/* Search bar and filter button row (desktop: flex row, mobile: stacked) */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-0">
          {/* Search bar */}
          <form
            className="flex-1 flex mb-2 sm:mb-0"
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          >
            <input
              type="text"
              placeholder="Search events by name, summary, category, or price..."
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-3 border border-gray-200 rounded-l-2xl focus:ring-2 focus:ring-[#724E99] focus:border-r-0 focus:border-transparent transition-all shadow-lg text-base"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="bg-[#724E99] text-white font-bold py-2.5 sm:py-3 px-6 rounded-r-2xl shadow-lg hover:bg-purple-700 transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {searchLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </form>
          {/* Filter button */}
          <div className="w-full sm:w-auto flex justify-end mb-4 sm:mb-0">
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-2xl shadow-lg hover:bg-gray-100 transition-all text-[#724E99] font-semibold w-full sm:w-auto justify-center text-base"
              style={{ height: '48px' }}
            >
              <span>Filter Events</span>
              <SlidersHorizontal className="h-6 w-6" />
            </button>
          </div>
        </div>
        {/* Tips row: always below search/filter row on desktop, second row on mobile */}
        {!searchInput.trim() && (
          <div className="mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg w-full">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>💡</strong> Try: "free hackathon", "AI workshop", "networking"
            </p>
          </div>
        )}

        {/* Filter Modal */}
        <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)}>
          {/* Order: categories, calendar, time of day, location, pricing */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <CalendarBox
                selectedDates={selectedDates}
                setSelectedDates={setSelectedDates}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time of Day</label>
              <TimeOfDayFilter
                value={selectedTimeOfDay}
                onChange={setSelectedTimeOfDay}
                className="w-full"
                dropdownClassName="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
              >
                <option value="">All Locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pricing</label>
              <select
                value={selectedPricing}
                onChange={(e) => setSelectedPricing(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#724E99] focus:border-transparent transition-all appearance-none bg-white"
              >
                <option value="">All</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </FilterModal>

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

      <Footer onOpenModal={() => setIsModalOpen(true)} />
      
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default App;