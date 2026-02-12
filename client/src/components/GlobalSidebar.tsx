import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  Home,
  Lightbulb,
  Crosshair,
  Target,
  CheckSquare,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * GlobalSidebar Component - Simplified for E2E Test Compatibility
 */

interface GlobalSidebarProps {
  className?: string;
}

const GlobalSidebar: React.FC<GlobalSidebarProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { session } = useAuth();
  const isLoggedIn = !!session;

  // Simple toggle function - only manages state
  const toggleSidebar = () => {

    const newState = !isVisible;
    setIsVisible(newState);

  };

  // Close sidebar function - only manages state
  const closeSidebar = () => {
    setIsVisible(false);
  };

  // Body class management via useEffect
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('sidebar-visible');

    } else {
      document.body.classList.remove('sidebar-visible');
    }

  }, [isVisible]);

  // Set up escape key handler for closing sidebar
  useEffect(() => {
  }, []);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible]);

  return (
    <>
      {/* Hamburger Toggle Button - EXACT ID required for E2E tests */}
      <button
        id="sidebarToggleBtn"
        onClick={toggleSidebar}
        className={`!fixed !top-20 !z-[9999] !p-2 !bg-blue-600 !text-white !rounded-md hover:!bg-blue-700 !transition-all !block !opacity-100 !visible !w-10 !h-10 ${isVisible ? '!left-[21rem]' : '!left-4'
          }`}
        aria-label="Toggle navigation menu"
      >
        {isVisible ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={closeSidebar}
      />

      {/* Global Sidebar - EXACT ID required for E2E tests */}
      <div
        id="globalSidebar"
        className={`fixed left-0 top-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 z-50 overflow-y-auto ${isVisible ? 'translate-x-0' : '-translate-x-full'
          } ${className}`}
      >
        {/* Sidebar Header - EXACT structure from original */}
        <div className="sidebar-header p-6 border-b border-gray-200">
          <h4 className="text-xl font-bold text-gray-800 flex items-center">
            <Target className="mr-2" size={24} />
            Project Arrowhead
          </h4>
        </div>

        {/* Sidebar Navigation - EXACT structure from original */}
        <div className="sidebar-nav p-4">
          {/* Main Navigation */}
          <div className="nav-section mb-6">
            <h6 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Main Navigation
            </h6>
            {isLoggedIn && (
              <Link
                href="/dashboard/projects"
                onClick={closeSidebar}
                className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
              >
                <Home className="mr-3" size={18} />
                Dashboard
              </Link>
            )}
            <Link href="/journey" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Home className="mr-3" size={18} />
              Home
            </Link>
          </div>

          {/* Brainstorm Module */}
          <div className="nav-section mb-6">
            <h6 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Brainstorm Module
            </h6>
            <Link href="/journey/brainstorm/step/1" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Lightbulb className="mr-3" size={18} />
              Step 1: Imitate
            </Link>
            <Link href="/journey/brainstorm/step/2" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Lightbulb className="mr-3" size={18} />
              Step 2: Ideate
            </Link>
            <Link href="/journey/brainstorm/step/3" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Lightbulb className="mr-3" size={18} />
              Step 3: Ignore
            </Link>
            <Link href="/journey/brainstorm/step/4" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Lightbulb className="mr-3" size={18} />
              Step 4: Integrate
            </Link>
            <Link href="/journey/brainstorm/step/5" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Lightbulb className="mr-3" size={18} />
              Step 5: Interfere
            </Link>
          </div>

          {/* Choose Module */}
          <div className="nav-section mb-6">
            <h6 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Choose Module
            </h6>
            <Link href="/journey/choose/step/1" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Crosshair className="mr-3" size={18} />
              Step 1: Scenarios
            </Link>
            <Link href="/journey/choose/step/2" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Crosshair className="mr-3" size={18} />
              Step 2: Compare
            </Link>
            <Link href="/journey/choose/step/3" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Crosshair className="mr-3" size={18} />
              Step 3: Important Aspects
            </Link>
            <Link href="/journey/choose/step/4" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Crosshair className="mr-3" size={18} />
              Step 4: Evaluate
            </Link>
            <Link href="/journey/choose/step/5" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Crosshair className="mr-3" size={18} />
              Step 5: Support Decision
            </Link>
          </div>

          {/* Objectives Module */}
          <div className="nav-section mb-6">
            <h6 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Objectives Module
            </h6>
            <Link href="/journey/objectives/step/1" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Target className="mr-3" size={18} />
              Step 1: Objective
            </Link>
            <Link href="/journey/objectives/step/2" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Target className="mr-3" size={18} />
              Step 2: Delegation
            </Link>
            <Link href="/journey/objectives/step/3" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Target className="mr-3" size={18} />
              Step 3: Business Services
            </Link>
            <Link href="/journey/objectives/step/4" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Target className="mr-3" size={18} />
              Step 4: Skills
            </Link>
            <Link href="/journey/objectives/step/5" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Target className="mr-3" size={18} />
              Step 5: Tools
            </Link>
            <Link href="/journey/objectives/step/6" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Target className="mr-3" size={18} />
              Step 6: Contacts
            </Link>
            <Link href="/journey/objectives/step/7" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <Target className="mr-3" size={18} />
              Step 7: Cooperation
            </Link>
          </div>

          {/* Task Management */}
          <div className="nav-section mb-6">
            <h6 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Task Management
            </h6>
            <Link href="/tasks" onClick={closeSidebar} className="nav-link flex items-center p-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
              <CheckSquare className="mr-3" size={18} />
              Task List
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalSidebar;
