import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface CalendarBoxProps {
  selectedDates: { start: Date | null; end: Date | null };
  setSelectedDates: (dates: { start: Date | null; end: Date | null }) => void;
}

const CalendarBox: React.FC<CalendarBoxProps> = ({ selectedDates, setSelectedDates }) => {
  // For simplicity, use native input type="date" for both single and range selection
  const [rangeMode, setRangeMode] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full md:w-[420px] flex flex-col items-center justify-center min-h-[180px]">
      <div className="flex items-center justify-between w-full mb-4">
        <span className="text-lg font-semibold text-gray-900">Select Date</span>
        <button
          className={`ml-2 px-3 py-1 text-xs rounded-full transition ${rangeMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} hover:bg-blue-200`}
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
            className="border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 w-full text-center"
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
            className="border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 w-full text-center"
            calendarClassName="!rounded-xl !shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default CalendarBox; 