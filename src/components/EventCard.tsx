import React from 'react';
import { Calendar, Clock, MapPin, ExternalLink, Tag, User } from 'lucide-react';

interface Event {
  event_name: string;
  event_url: string;
  event_summary: string;
  full_address: string;
  region: string;
  presented_by_name: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  event_category: string;
  price_cents: string;
  start_datetime_utc?: string;
  end_datetime_utc?: string;
}

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
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

  const formatDateTimeLocal = (utcString?: string, fallbackDate?: string, fallbackTime?: string) => {
    if (utcString) {
      const date = new Date(utcString);
      return date.toLocaleString();
    }
    if (fallbackDate && fallbackTime) {
      const date = new Date(`${fallbackDate}T${fallbackTime}`);
      return date.toLocaleString();
    }
    return '';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.event_category)}`}>
                <Tag className="h-3 w-3 inline mr-1" />
                {event.event_category}
                {event.price_cents && !isNaN(Number(event.price_cents)) && Number(event.price_cents) > 0 && (
                  <span className="ml-2 text-green-700 font-semibold">${(Number(event.price_cents) / 100).toFixed(2)}</span>
                )}
                {event.price_cents && (!isNaN(Number(event.price_cents)) && Number(event.price_cents) === 0) && (
                  <span className="ml-2 text-blue-700 font-semibold">Free</span>
                )}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
              <a href={event.event_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {event.event_name}
              </a>
            </h3>
            <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
              {event.event_summary}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{formatDateTimeLocal(event.start_datetime_utc, event.start_date, event.start_time).split(',')[0]}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{formatDateTimeLocal(event.start_datetime_utc, event.start_date, event.start_time).split(',')[1]?.trim()} - {formatDateTimeLocal(event.end_datetime_utc, event.end_date, event.end_time).split(',')[1]?.trim()}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="line-clamp-1">{event.full_address}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <User className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="line-clamp-1">{event.presented_by_name}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {event.full_address}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EventCard;