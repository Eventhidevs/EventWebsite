import React from 'react';
import logo from '../images/logo.png';

const Hero: React.FC = () => {
  return (
    <div className="relative">
      {/* Top section with #FBF2FF background */}
      <div style={{ background: '#FBF2FF', height: '48px', width: '100%' }}></div>
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden pt-2 pb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-start gap-6">
          {/* Left: Small Logo (10%) */}
          <div className="flex-[1] flex flex-col items-start justify-start mt-0">
            <img src={logo} alt="HiDevs Logo" className="h-16 w-16 object-contain" />
          </div>
          {/* Right: Text Content (90%) */}
          <div className="flex-[9] flex flex-col justify-start mt-0">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight max-w-5xl mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">San Francisco</span>
              <span className="text-black">’s Event Scene - All in One Place</span>
            </h1>
            <div className="text-xl text-gray-700 max-w-3xl font-normal mb-2">
              A smarter way to discover events and workshops, powered by real-time data from Luma, Meetup, and more. Powered by <a href="https://www.hidevs.xyz/" target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold underline hover:text-purple-600">HiDevs</a>, The Gen AI Upskilling Engine for Tomorrow's Workforce.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;