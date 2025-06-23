import React from 'react';
import { Filter } from 'lucide-react';
import TimeOfDayFilter from './TimeOfDayFilter';

interface FiltersProps {
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  categories: string[];
  selectedTimeOfDay: string;
  setSelectedTimeOfDay: (val: string) => void;
}

export const PricingFilter: React.FC<{ selectedPricing: string; setSelectedPricing: (pricing: string) => void; }> = ({ selectedPricing, setSelectedPricing }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 sm:p-4 w-full h-full flex flex-col justify-center">
    <div className="flex items-center gap-2 mb-1 sm:mb-2">
      <span style={{ color: '#724E99' }} className="font-semibold text-sm sm:text-base">Pricing</span>
    </div>
    <div>
      <select
        value={selectedPricing}
        onChange={(e) => setSelectedPricing(e.target.value)}
        className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#724E99] focus:border-transparent transition-all appearance-none bg-white"
      >
        <option value="">All</option>
        <option value="free">Free</option>
        <option value="paid">Paid</option>
      </select>
    </div>
  </div>
);

const Filters: React.FC<FiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  categories,
  selectedTimeOfDay,
  setSelectedTimeOfDay,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 sm:p-4 w-full h-full flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-2">
        <Filter style={{ color: 'rgb(114, 78, 153)' }} className="h-5 w-5" />
        <h2 style={{ color: 'rgb(114, 78, 153)' }} className="font-semibold text-sm sm:text-base">Filter Events</h2>
      </div>
      <div className="flex flex-col gap-2">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <TimeOfDayFilter
          value={selectedTimeOfDay}
          onChange={setSelectedTimeOfDay}
          className="w-full"
          dropdownClassName="w-full"
        />
      </div>
    </div>
  );
};

export default Filters;
