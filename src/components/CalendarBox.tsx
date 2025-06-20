import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

interface CalendarBoxProps {
  selectedDates: { start: Date | null; end: Date | null };
  setSelectedDates: (dates: { start: Date | null; end: Date | null }) => void;
}

const CalendarBox: React.FC<CalendarBoxProps> = ({ selectedDates, setSelectedDates }) => {
  // For simplicity, use native input type="date" for both single and range selection
  const [rangeMode, setRangeMode] = useState(false);

  const clearDates = () => {
    setSelectedDates({ start: null, end: null });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 sm:p-4 w-full h-full flex flex-col justify-center">
      <div className="flex items-center justify-between w-full mb-1 sm:mb-2">
        <span style={{ color: 'rgb(114, 78, 153)' }} className="font-semibold text-sm sm:text-base">Select Date</span>
        <button
          style={rangeMode ? { backgroundColor: 'rgb(114, 78, 153)', color: 'white' } : {}}
          className="ml-2 px-2 py-0.5 text-xs rounded-full transition bg-gray-100 text-gray-700 hover:opacity-90"
          onClick={() => setRangeMode((prev) => !prev)}
        >
          Date Range
        </button>
      </div>
      {rangeMode ? (
        <div className="w-full flex flex-col items-center gap-2">
          <div className="relative w-full">
            <DatePicker
              selectsRange
              startDate={selectedDates.start}
              endDate={selectedDates.end}
              onChange={(dates: [Date | null, Date | null]) => {
                setSelectedDates({ start: dates[0], end: dates[1] });
              }}
              isClearable
              withPortal
              placeholderText="Select date range"
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 w-full text-center pr-8"
              calendarClassName="!rounded-xl !shadow-lg"
            />
            {(selectedDates.start || selectedDates.end) && (
              <button
                onClick={clearDates}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Clear dates"
              >
                <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <div className="relative w-full">
            <DatePicker
              selected={selectedDates.start}
              onChange={(date: Date | null) => setSelectedDates({ start: date, end: null })}
              isClearable
              withPortal
              placeholderText="Select date"
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 w-full text-center pr-8"
              calendarClassName="!rounded-xl !shadow-lg"
            />
            {selectedDates.start && (
              <button
                onClick={clearDates}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Clear date"
              >
                <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarBox; 