import React from 'react';
import { Filter } from 'lucide-react';

interface FiltersProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: string[];
  compact?: boolean;
}

const Filters: React.FC<FiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  categories,
  compact = false
}) => {
  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${compact ? 'p-4 min-h-0' : 'p-8 min-h-[180px]'} w-full md:w-[260px] flex flex-col justify-center flex-1`}>
      <div className={`flex items-center gap-2 ${compact ? 'mb-2' : 'mb-6'}`}>
        <Filter style={{ color: 'rgb(114, 78, 153)' }} className="h-5 w-5" />
        <h2 style={{ color: 'rgb(114, 78, 153)' }} className={`font-semibold ${compact ? 'text-base' : 'text-lg'}`}>Filter Events</h2>
      </div>
      <div>
        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={`${compact ? 'w-[180px] px-2 py-2 text-sm' : 'w-full px-4 py-3'} border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white`}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Filters;
