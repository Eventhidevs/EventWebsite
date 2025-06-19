import React from 'react';
import logo from '../images/logo.png';

const Hero: React.FC = () => {
  return (
    <div className="relative">
      {/* Top section with #FBF2FF background */}
      <div style={{ background: '#FBF2FF', height: '48px', width: '100%' }}></div>
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden pt-2 pb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-0 flex flex-col md:flex-row items-center md:gap-32 gap-6 text-center md:text-left">
          {/* Left: Large Logo as Link */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center mb-4 md:mb-0">
            <a href="https://www.hidevs.xyz/" target="_blank" rel="noopener noreferrer">
              <img src={logo} alt="HiDevs Logo" className="h-24 w-24 md:h-32 md:w-32 object-contain" />
            </a>
          </div>
          {/* Right: Text Content */}
          <div className="flex-1 flex flex-col justify-center mt-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight max-w-full mb-4 whitespace-normal">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">San Francisco</span>
              <span className="text-black">’s Event Scene - All in One Place</span>
            </h1>
            <div className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl font-normal mb-2">
              A smarter way to discover events and workshops.
            </div>
            <div className="text-sm sm:text-base md:text-lg text-gray-700 max-w-3xl font-normal mt-2">
              Powered by <a href="https://www.hidevs.xyz/" target="_blank" rel="noopener noreferrer" className="text-purple-700 font-semibold underline hover:text-purple-600">HiDevs</a>, The Gen AI Upskilling Engine for Tomorrow's Workforce.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;