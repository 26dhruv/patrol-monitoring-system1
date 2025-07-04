import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { hasRole } = useAuth();
  const isOfficer = hasRole('officer') && !hasRole(['admin', 'manager']);

  // Navigation items with role-based access
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', roles: ['admin', 'manager', 'officer'] },
    { name: isOfficer ? 'My Patrols' : 'Patrols', href: isOfficer ? '/my-patrols' : '/patrols', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', roles: ['admin', 'manager', 'officer'] },
    { name: 'AI Scheduler', href: '/ai-scheduler', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', roles: ['admin', 'manager'] },
    { name: 'Officers', href: '/officers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', roles: ['admin', 'manager'] },
    { name: 'Patrol Routes', href: '/patrol-routes', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3', roles: ['admin', 'manager'] },
    { name: 'Reports', href: '/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['admin', 'manager'] },
    { name: 'Incidents', href: '/incidents', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', roles: ['admin', 'manager', 'officer'] },
    { name: 'Settings', href: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', roles: ['admin', 'manager', 'officer'] },
  ];

  // Filter navigation items based on user roles
  const filteredNavigation = navigation.filter(item => {
    return !item.roles || hasRole(item.roles);
  });

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden bg-[#050a15]/80 backdrop-blur-md transition-opacity"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#071425]/90 backdrop-blur-md border-r border-blue-900/30 shadow-lg transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:h-screen`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-blue-900/30">
          <Link to="/dashboard" className="flex items-center">
            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Patrol Monitor</span>
          </Link>
          
          {/* Close button for mobile */}
          <button
            type="button"
            className="md:hidden text-blue-300 hover:text-blue-400 hover:bg-blue-900/30 rounded-full p-2 focus:outline-none"
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-4 px-2 h-full overflow-y-auto">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              // Check if current path starts with the nav item's href for nested routes
              const isActive = 
                location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href)) ||
                // Special case for patrols - consider both /patrols and /my-patrols as active for the Patrols menu item
                ((item.href === '/patrols' || item.href === '/my-patrols') && 
                 (location.pathname.startsWith('/patrols') || location.pathname.startsWith('/my-patrols')));
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-900/30 text-blue-300 border-l-2 border-blue-500'
                      : 'text-blue-100/70 hover:bg-blue-900/20 hover:text-blue-300'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <svg
                    className={`mr-3 h-5 w-5 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-blue-400/60 group-hover:text-blue-400'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.name}
                  
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-blue-500"></span>
                  )}
                </Link>
              );
            })}
          </div>
          
          {/* Support section at bottom */}
          <div className="mt-6 pt-6 border-t border-blue-900/30">
            <div className="px-3 mb-3">
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Support</h3>
            </div>
            <a 
              href="#" 
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-blue-100/70 hover:bg-blue-900/20 hover:text-blue-300"
            >
              <svg className="mr-3 h-5 w-5 text-blue-400/60 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help Center
            </a>
            <a 
              href="#" 
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-blue-100/70 hover:bg-blue-900/20 hover:text-blue-300"
            >
              <svg className="mr-3 h-5 w-5 text-blue-400/60 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Support
            </a>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar; 