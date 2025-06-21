import React from 'react';
import logo from '../images/logo.png';

const Hero: React.FC = () => {
  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl overflow-hidden mb-4">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
      <div className="relative max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-12 text-center sm:text-left p-2">
        <div className="flex-shrink-0">
          <a href="https://www.hidevs.xyz/" target="_blank" rel="noopener noreferrer">
            <img src={logo} alt="HiDevs Logo" className="h-16 sm:h-20 object-contain" />
          </a>
        </div>
        <div className="flex-1">
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900">
            <span className="text-[#724E99]">San Francisco's</span> Event Scene - All in One Place
          </h1>
          <p className="mt-2 text-sm sm:text-lg text-gray-700">
            A smarter way to discover events and workshops.
          </p>
          <p className="mt-1 text-xs sm:text-base text-gray-600">
            Powered by <a href="https://www.hidevs.xyz/" target="_blank" rel="noopener noreferrer" className="text-purple-700 font-semibold underline hover:text-purple-600">HiDevs</a>, The Gen AI Upskilling Engine for Tomorrow's Workforce.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Hero;