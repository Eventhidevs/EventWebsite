import React from 'react';
import logo from '../images/logo.png';
import piyushProfile from '../images/piyush_profile.jpg';
import prakharProfile from '../images/prakhar_profile.jpg';
import { FaLinkedin, FaYoutube } from 'react-icons/fa';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200 py-14 px-4" style={{ background: '#FBF2FF' }}>
      <div className="max-w-6xl mx-auto rounded-3xl border border-gray-200 p-14 flex flex-col md:flex-row gap-10 bg-transparent shadow-lg">
        {/* Left: HiDevs Info (70%) */}
        <div className="flex-[7] flex flex-col gap-8 min-w-[260px] justify-between">
          <div>
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center justify-center w-24 h-24">
                <img src={logo} alt="HiDevs Logo" className="h-20 w-20 object-contain" />
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
              Visit: <a href="https://hidevs.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">hidevs.xyz</a>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <a href="https://www.linkedin.com/company/hidevs-gen-ai-workforce/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center text-blue-700 hover:text-blue-900 transition text-2xl">
                <FaLinkedin size={32} />
              </a>
              <a href="https://www.youtube.com/@hidevs-gen-ai-workforce" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center text-blue-700 hover:text-blue-900 transition text-2xl">
                <FaYoutube size={32} />
              </a>
            </div>
          </div>
          <div className="text-base text-blue-700 mt-8">© 2025 HiDevs. All Rights Reserved</div>
        </div>
        {/* Right: Made by Section (30%) */}
        <div className="flex-[3] flex flex-col items-center justify-center gap-8 min-w-[220px]">
          <div className="text-xl font-bold text-gray-900 mb-4">Made by</div>
          <div className="flex flex-row gap-8 items-center justify-center w-full">
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
    </footer>
  );
};

export default Footer;