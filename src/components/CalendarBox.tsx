import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface CalendarBoxProps {
  selectedDates: { start: Date | null; end: Date | null };
  setSelectedDates: (dates: { start: Date | null; end: Date | null }) => void;
  compact?: boolean;
}

const CalendarBox: React.FC<CalendarBoxProps> = ({ selectedDates, setSelectedDates, compact = false }) => {
  // For simplicity, use native input type="date" for both single and range selection
  const [rangeMode, setRangeMode] = useState(false);

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${compact ? 'p-4 min-h-0' : 'p-8 min-h-[180px]'} w-full md:w-[320px] flex flex-col items-center justify-center`}>
      <div className={`flex items-center justify-between w-full ${compact ? 'mb-2' : 'mb-4'}`}>
        <span style={{ color: 'rgb(114, 78, 153)' }} className={`font-semibold ${compact ? 'text-base' : 'text-lg'}`}>Select Date</span>
        <button
          style={rangeMode ? { backgroundColor: 'rgb(114, 78, 153)', color: 'white' } : {}}
          className={`ml-2 px-3 py-1 text-xs rounded-full transition ${rangeMode ? '' : 'bg-gray-100 text-gray-700'} hover:opacity-90`}
          onClick={() => setRangeMode((prev) => !prev)}
        >
          {rangeMode ? 'Date Range' : 'Date Range'}
        </button>
      </div>
      {rangeMode ? (
        <div className="w-full flex flex-col items-center gap-2">
          <DatePicker
            selectsRange
            startDate={selectedDates.start}
            endDate={selectedDates.end}
            onChange={(dates: [Date | null, Date | null]) => {
              setSelectedDates({ start: dates[0], end: dates[1] });
            }}
            isClearable
            placeholderText="Select date range"
            className={`border border-gray-200 rounded-lg ${compact ? 'px-2 py-2 text-sm' : 'px-4 py-2'} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 w-full text-center`}
            calendarClassName="!rounded-xl !shadow-lg"
          />
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <DatePicker
            selected={selectedDates.start}
            onChange={(date: Date | null) => setSelectedDates({ start: date, end: null })}
            isClearable
            placeholderText="Select date"
            className={`border border-gray-200 rounded-lg ${compact ? 'px-2 py-2 text-sm' : 'px-4 py-2'} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 w-full text-center`}
            calendarClassName="!rounded-xl !shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default CalendarBox; 