import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { isAuthenticated } = useAuth();

  // Track scroll position for gradient effects
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const progress = Math.min(scrollY / documentHeight, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050a15] text-blue-100">
      {/* Gradient Background */}
      <div 
        className="fixed inset-0 transition-colors duration-500 z-[-1]"
        style={{
          background: `linear-gradient(to bottom, rgba(5, 10, 21, ${1 - scrollProgress * 0.3}) 0%, rgba(6, 18, 36, ${0.5 + scrollProgress * 0.3}) 50%, rgba(7, 26, 59, ${0.8 + scrollProgress * 0.2}) 100%)`
        }}
      ></div>
      
      {/* Floating particles background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-blue-400 animate-float-slow"></div>
        <div className="absolute top-3/4 left-1/2 w-2 h-2 rounded-full bg-blue-500 animate-float-medium"></div>
        <div className="absolute top-1/3 left-3/4 w-1 h-1 rounded-full bg-blue-300 animate-float-fast"></div>
        <div className="absolute top-2/3 left-1/5 w-1.5 h-1.5 rounded-full bg-blue-400 animate-float-medium"></div>
        <div className="absolute top-1/2 left-4/5 w-1 h-1 rounded-full bg-blue-300 animate-float-slow"></div>
      </div>
      
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Add global CSS for animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-15px) translateX(5px); }
        }
        
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(-10px); }
        }
        
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-10px) translateX(10px); }
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes grow-width {
          from { width: 0; }
          to { width: 100%; }
        }
        
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        
        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }
        
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }
        
        .animate-fadeUp {
          animation: fadeUp 0.8s ease-out forwards;
        }
        
        .animate-grow-width {
          animation: grow-width 1.5s ease-out forwards;
        }
        
        .animation-delay-100 {
          animation-delay: 0.1s;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
        
        .shadow-glow {
          box-shadow: 0 0 15px;
        }
        
        /* Glassmorphism Card */
        .card-glass {
          background: rgba(8, 20, 37, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.5rem;
        }
        
        /* Enhanced Button Styles */
        .btn-primary {
          background: linear-gradient(135deg, #2563EB, #1E40AF);
          color: white;
          font-weight: 500;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          border: none;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-primary:hover {
          background: linear-gradient(135deg, #3B82F6, #2563EB);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }
        
        .btn-primary:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }
        
        .btn-outline {
          background: rgba(8, 20, 37, 0.4);
          color: #93c5fd;
          font-weight: 500;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(59, 130, 246, 0.5);
          transition: all 0.3s ease;
          backdrop-filter: blur(4px);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-outline:hover {
          background: rgba(37, 99, 235, 0.2);
          border-color: rgba(59, 130, 246, 0.8);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }
        
        .btn-outline:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
        }
        
        .btn-sm-outline {
          background: rgba(8, 20, 37, 0.4);
          color: #93c5fd;
          font-weight: 500;
          font-size: 0.875rem;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid rgba(59, 130, 246, 0.5);
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-sm-outline:hover {
          background: rgba(37, 99, 235, 0.2);
          border-color: rgba(59, 130, 246, 0.8);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }
        
        .btn-sm-outline:active {
          transform: translateY(0);
          box-shadow: 0 1px 4px rgba(37, 99, 235, 0.2);
        }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default MainLayout; 