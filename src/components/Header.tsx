import React from 'react';
import logo from '../images/logo.png';

const Header: React.FC = () => (
  <header className="w-full px-4 py-4 bg-gradient-to-b from-[#e6e6fa] to-[#f8f8ff] rounded-b-3xl mb-4">
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-row items-center gap-2 sm:gap-6 sm:justify-start">
        <img src={logo} alt="HiDevs Logo" className="h-12 w-12 sm:h-16 sm:w-16 object-contain mr-2 sm:mr-4" />
        <div className="flex flex-col text-left">
          <h1 className="text-lg sm:text-3xl font-bold text-[#724E99] leading-tight">
            AI Event Scene - All in One Place
          </h1>
          <p className="text-sm sm:text-base text-gray-700 mt-1">
            A smarter way to discover events and workshops.<br className="hidden sm:block" />
            Powered by <a href="https://hidevs.xyz" className="text-[#724E99] underline font-semibold">HiDevs</a>, The Gen AI Upskilling Engine for Tomorrow's Workforce.
          </p>
        </div>
      </div>
    </div>
  </header>
);

export default Header;