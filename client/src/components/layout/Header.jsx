import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header = ({ setSidebarOpen }) => {
  const { currentUser, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle status indicator color
  const getStatusColor = (status) => {
    switch (status) {
      case 'on-duty':
        return 'bg-green-500';
      case 'off-duty':
        return 'bg-gray-400';
      case 'inactive':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#050a15]/80 backdrop-blur-lg border-b border-blue-900/30">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden text-blue-300 hover:text-blue-400 focus:outline-none p-2 rounded-full hover:bg-blue-900/30"
          onClick={() => setSidebarOpen(true)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Title - Mobile */}
        <h1 className="md:hidden text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Patrol Monitor</h1>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex items-center flex-1 ml-4">
          <div className="max-w-lg w-full">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-blue-900/30 rounded-lg leading-5 bg-[#071425]/50 placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-[#071425]/70 text-sm text-blue-100"
                placeholder="Search patrols, officers..."
              />
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div className="ml-4 flex items-center">
          <div className="relative" ref={userMenuRef}>
            <button
              className="flex items-center max-w-xs rounded-full focus:outline-none"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="flex items-center">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-glow shadow-blue-500/20">
                    {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 rounded-full h-3 w-3 border-2 border-[#050a15] ${getStatusColor(currentUser?.status)}`}></div>
                </div>
                <span className="ml-2 text-sm font-medium text-blue-100 hidden md:block">
                  {currentUser?.name || 'User'}
                </span>
                <svg className="ml-1 h-5 w-5 text-blue-400 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* User Menu Dropdown */}
            {userMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[#071425] border border-blue-900/30 backdrop-blur-lg ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-blue-900/30">
                    <p className="text-sm font-medium text-blue-100 truncate">{currentUser?.name}</p>
                    <p className="text-xs text-blue-300/70 truncate">{currentUser?.email}</p>
                    <p className="text-xs text-blue-300/70 mt-1">
                      Role: <span className="font-medium capitalize">{currentUser?.role}</span>
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-blue-100 hover:bg-blue-900/30"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Your Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-blue-100 hover:bg-blue-900/30"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-blue-900/30"
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <button className="ml-4 p-1 rounded-full text-blue-300 hover:text-blue-400 hover:bg-blue-900/30 transition-colors focus:outline-none relative">
            <span className="sr-only">View notifications</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#050a15]"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 