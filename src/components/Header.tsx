import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white/80 border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-8">
          {/* Header intentionally left minimal */}
        </div>
      </div>
    </header>
  );
};

export default Header;