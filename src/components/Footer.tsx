import React from 'react';
import logo from '../images/logo.png';
import piyushProfile from '../images/piyush_profile.jpg';
import prakharProfile from '../images/prakhar_profile.jpg';
import deepaksirProfile from '../images/deepaksir_profile.jpg';
import { FaLinkedin, FaYoutube } from 'react-icons/fa';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200 py-4 px-2" style={{ background: '#FBF2FF' }}>
      <div className="w-full flex flex-col gap-2 bg-transparent">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 w-full">
          {/* Left: HiDevs Info */}
          <div className="flex-[7] flex flex-col gap-2 min-w-[260px] justify-center md:pl-8">
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center justify-center w-20 h-20">
                <a href="https://www.hidevs.xyz/" target="_blank" rel="noopener noreferrer">
                  <img src={logo} alt="HiDevs Logo" className="h-16 w-16 object-contain" />
                </a>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-tight">The Gen AI Upskilling Engine</div>
                <div className="text-lg text-gray-700 font-medium">Built for College Graduates, professionals, and teams.</div>
              </div>
            </div>
            <div className="text-gray-800 text-base mb-4" style={{padding: '20px 0', fontSize: '1.25rem'}}>
              <div className="mb-2 font-semibold">We help people grow through:</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Personalized learning roadmaps</li>
                <li>AI mentorship & real-time feedback</li>
                <li>Skill diagnostics & upskilling tools</li>
                <li>Job-ready projects & hiring support</li>
                <li>GenAI workshops & campus programs</li>
              </ol>
            </div>
            <div className="text-xl font-semibold text-gray-900 mt-4">Whether you're starting out or upskilling, HiDevs helps you get there.</div>
            <div className="text-lg text-gray-700 mt-2 mb-4">
              Visit: <a href="https://hidevs.xyz" target="_blank" rel="noopener noreferrer" className="font-semibold underline text-[#724E99]">hidevs.xyz</a>
            </div>
            <div className="flex flex-col items-start gap-2 mb-4">
              <div className="text-base font-semibold text-gray-900">To Feature Events:</div>
              <button
                type="button"
                onClick={() => alert('Open Submit Event Modal')}
                className="bg-[#724E99] text-white font-semibold text-base py-2 px-6 rounded-xl shadow-md hover:bg-purple-700 transition-all flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span>
                Submit Event
              </button>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <a href="https://www.linkedin.com/company/hidevs-gen-ai-workforce/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center text-blue-700 hover:text-blue-900 transition text-2xl">
                <FaLinkedin size={32} />
              </a>
              <a href="https://www.youtube.com/@hidevs-gen-ai-workforce" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center text-red-600 hover:text-red-800 transition text-2xl">
                <FaYoutube size={32} />
              </a>
            </div>
          </div>
          {/* Right: Team and Developed by Section */}
          <div className="flex-[3] flex flex-col items-center md:items-end justify-center gap-1 min-w-[220px]">
            <div className="text-xl font-bold text-gray-900 mb-2 md:mb-2 text-center w-full">Our Team</div>
            <div className="flex items-center gap-4 mb-4 justify-center w-full">
              <img src={deepaksirProfile} alt="Deepak Chawla" className="h-14 w-14 rounded-full object-cover border-2 border-blue-200" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <a href="https://www.linkedin.com/in/deepakchawla1307/" target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold text-lg hover:underline flex items-center gap-1">
                    Deepak Chawla
                  </a>
                  <span className="text-gray-700 text-base">- Founder, HiDevs</span>
                </div>
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-2 md:mb-2 text-center w-full">Developed by</div>
            <div className="flex flex-row gap-8 items-center justify-center w-full md:justify-center">
              {/* Piyush Kheria */}
              <div className="flex flex-row items-center gap-3">
                <img src={piyushProfile} alt="Piyush Kheria" className="h-12 w-12 rounded-full object-cover border-2 border-blue-200" />
                <a href="https://www.linkedin.com/in/piyush-kheria-84b6ba302/" target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold text-lg hover:underline flex items-center gap-1">
                  Piyush Kheria
                </a>
              </div>
              {/* Prakhar Parashar */}
              <div className="flex flex-row items-center gap-3">
                <img src={prakharProfile} alt="Prakhar Parashar" className="h-12 w-12 rounded-full object-cover border-2 border-blue-200" />
                <a href="https://www.linkedin.com/in/prakhar-parashar-55004b2a6/" target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold text-lg hover:underline flex items-center gap-1">
                  Prakhar Parashar
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-base text-blue-700 text-center w-full">© 2025 HiDevs. All Rights Reserved</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;