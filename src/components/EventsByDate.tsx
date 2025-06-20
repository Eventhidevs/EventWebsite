import React, { useState, useMemo, useRef } from 'react';
import { Calendar, Clock, MapPin, ExternalLink, Tag, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '../utils/csvParser';

interface EventsByDateProps {
  events: Event[];
}

const EVENTS_PER_PAGE = 30;

const EventsByDate: React.FC<EventsByDateProps> = ({ events }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  // Filter out events with invalid or empty start_date
  const validEvents = useMemo(() => events.filter(event => {
    if (!event.start_date) return false;
    const dateObj = new Date(event.start_date);
    return !isNaN(dateObj.getTime());
  }), [events]);

  // Group events by date
  const groupedEvents = useMemo(() => validEvents.reduce((groups, event) => {
    const date = event.start_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, Event[]>), [validEvents]);

  // Sort dates
  const sortedDates = useMemo(() => Object.keys(groupedEvents).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  ), [groupedEvents]);

  // Calculate pagination
  const totalEvents = validEvents.length;
  const shouldPaginate = totalEvents > EVENTS_PER_PAGE;
  const totalPages = shouldPaginate ? Math.ceil(totalEvents / EVENTS_PER_PAGE) : 1;
  const startIndex = shouldPaginate ? (currentPage - 1) * EVENTS_PER_PAGE : 0;
  const endIndex = shouldPaginate ? startIndex + EVENTS_PER_PAGE : totalEvents;

  // Get events for current page
  const currentPageEvents = useMemo(() => {
    if (!shouldPaginate) {
      // If we have fewer events than the page size, return all events grouped by date
      return sortedDates.map(date => ({
        date,
        events: groupedEvents[date]
      }));
    }

    let count = 0;
    const pageEvents: { date: string; events: Event[] }[] = [];
    
    for (const date of sortedDates) {
      const dateEvents = groupedEvents[date];
      if (count + dateEvents.length > startIndex) {
        const remaining = EVENTS_PER_PAGE - (pageEvents.length > 0 ? pageEvents.reduce((sum, group) => sum + group.events.length, 0) : 0);
        const eventsToShow = dateEvents.slice(
          Math.max(0, startIndex - count),
          Math.min(dateEvents.length, startIndex - count + remaining)
        );
        if (eventsToShow.length > 0) {
          pageEvents.push({ date, events: eventsToShow });
        }
      }
      count += dateEvents.length;
      if (count >= endIndex) break;
    }
    return pageEvents;
  }, [sortedDates, groupedEvents, startIndex, endIndex, shouldPaginate]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    eventsContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    
    if (dateObj.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateObj.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(dateObj);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Technology': 'bg-blue-100 text-blue-800',
      'Music': 'bg-purple-100 text-purple-800',
      'Business': 'bg-green-100 text-green-800',
      'Food & Drink': 'bg-orange-100 text-orange-800',
      'Arts & Culture': 'bg-pink-100 text-pink-800',
      'Sports & Fitness': 'bg-red-100 text-red-800',
      'Education': 'bg-yellow-100 text-yellow-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-100 rounded-full p-8 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
          <span className="text-4xl">🔍</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No valid events found</h3>
        <p className="text-gray-600 mb-4">Check your CSV for missing or invalid dates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" ref={eventsContainerRef}>
      {/* Events List */}
      {currentPageEvents.map(({ date, events }) => (
        <div key={date} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Date Header */}
          <div className="bg-gradient-to-r" style={{ background: 'rgba(114, 78, 153, 0.08)' }}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div style={{ background: 'rgb(114, 78, 153)' }} className="p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'rgb(114, 78, 153)' }}>{formatDate(date)}</h2>
                <p className="text-sm text-gray-600">
                  {events.length} {events.length === 1 ? 'event' : 'events'}
                </p>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="divide-y divide-gray-100">
            {events.map((event, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors group">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Time */}
                  <div className="flex-shrink-0 lg:w-24">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      {event.start_time}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium`} style={{ background: 'rgba(114, 78, 153, 0.08)', color: 'rgb(114, 78, 153)' }}>
                            <Tag className="h-3 w-3 inline mr-1" style={{ color: 'rgb(114, 78, 153)' }} />
                            {event.event_category}
                            {event.price_cents && !isNaN(Number(event.price_cents)) && Number(event.price_cents) > 0 && (
                              <span className="ml-2 text-green-700 font-semibold">${(Number(event.price_cents) / 100).toFixed(2)}</span>
                            )}
                            {event.price_cents && (!isNaN(Number(event.price_cents)) && Number(event.price_cents) === 0) && (
                              <span className="ml-2 text-blue-700 font-semibold">Free</span>
                            )}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                          <a href={event.event_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                            {event.event_name}
                            <ExternalLink className="h-4 w-4 inline ml-1 align-middle" style={{ color: 'rgb(114, 78, 153)' }} />
                          </a>
                        </h3>
                        
                        <EventSummary summary={event.event_summary} />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{event.full_address}</span>
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{event.presented_by_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Pagination Controls - Only show if we should paginate */}
      {shouldPaginate && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-8 w-full">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white transition-colors"
            style={{ minWidth: '90px' }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Previous</span>
          </button>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 max-w-full overflow-x-auto">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-8 h-8 rounded-lg font-semibold transition-colors ${
                  currentPage === page
                    ? 'bg-[#724E99] text-white shadow-md'
                    : 'text-gray-700 hover:bg-purple-100 bg-white'
                }`}
                style={{ minWidth: '2rem' }}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white transition-colors"
            style={{ minWidth: '70px' }}
          >
            <span className="hidden xs:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const EventSummary: React.FC<{ summary: string }> = ({ summary }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = summary.split(' ').length > 30 || summary.length > 180;
  if (!isLong) return <p className="text-gray-600 mb-3 leading-relaxed">{summary}</p>;
  return (
    <div className="mb-3">
      <p className="text-gray-600 leading-relaxed">
        {expanded ? summary : summary.slice(0, 180) + '...'}
      </p>
      <button
        className="text-blue-600 text-sm mt-1 underline focus:outline-none"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? 'Show Less' : 'Read More'}
      </button>
    </div>
  );
};

export default EventsByDate;