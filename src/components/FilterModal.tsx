import React from 'react';
import { X } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearFilters?: () => void;
  children: React.ReactNode;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onClearFilters, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close filter modal"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-[#724E99]">Filter Events</h2>
        </div>
        <div className="space-y-4">
          {children}
        </div>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-6 w-full border border-[#724E99] text-[#724E99] font-semibold py-2 rounded-xl hover:bg-[#F3EAFE] transition-all"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterModal; 