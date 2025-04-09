import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { patrolService } from '../services/api';
import Spinner from '../components/ui/Spinner';
import MapView from '../components/maps/MapView';
import IncidentStats from '../components/incidents/IncidentStats';

const StatCard = ({ title, value, icon, color = 'blue', className = '' }) => {
  return (
    <div className={`card-glass border border-${color}-900/30 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-blue-400 mb-2">{title}</h3>
          <p className={`text-2xl md:text-3xl font-bold text-${color}-300`}>{value}</p>
        </div>
        <div className={`p-3 bg-${color}-900/20 rounded-full`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [activePatrols, setActivePatrols] = useState([]);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch dashboard stats
        const dashboardResponse = await patrolService.getDashboardStats();
        setDashboardData(dashboardResponse.data.data);
        
        // Fetch active patrols for the map
        const patrolsResponse = await patrolService.getActivePatrols();
        setActivePatrols(patrolsResponse.data.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return <Spinner size="lg" fullScreen />;
  }
  
  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          Dashboard
        </h1>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => navigate('/patrols')}
            className="btn-primary"
          >
            View All Patrols
          </button>
          
          <button 
            onClick={() => navigate('/assign-patrol')}
            className="btn-outline"
          >
            Assign New Patrol
          </button>
        </div>
      </div>
      
      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Patrols" 
          value={dashboardData?.activePatrols || 0}
          icon={
            <svg className="h-6 w-6 text-blue-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        />
        
        <StatCard 
          title="Officers on Duty" 
          value={dashboardData?.officersOnDuty || 0}
          icon={
            <svg className="h-6 w-6 text-green-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          color="green"
        />
        
        <StatCard 
          title="Patrols Today" 
          value={dashboardData?.patrolsToday || 0}
          icon={
            <svg className="h-6 w-6 text-purple-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          color="purple"
        />
        
        <StatCard 
          title="Total Locations" 
          value={dashboardData?.totalLocations || 0}
          icon={
            <svg className="h-6 w-6 text-yellow-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 10.5C15 12.1569 13.6569 13.5 12 13.5C10.3431 13.5 9 12.1569 9 10.5C9 8.84315 10.3431 7.5 12 7.5C13.6569 7.5 15 8.84315 15 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.5 10.5C19.5 17.5 12 21.5 12 21.5C12 21.5 4.5 17.5 4.5 10.5C4.5 6.35786 7.85786 3 12 3C16.1421 3 19.5 6.35786 19.5 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          color="yellow"
        />
      </div>
      
      {/* Map and Incident Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Patrol Map */}
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
              Active Patrol Locations
            </h2>
          </div>
          <div className="h-[400px] rounded-lg overflow-hidden">
            {activePatrols.length > 0 ? (
              <MapView patrols={activePatrols} />
            ) : (
              <div className="h-full flex items-center justify-center bg-[#071425]/50 text-blue-400">
                No active patrol locations to display
              </div>
            )}
          </div>
        </div>
        
        {/* Incident Statistics */}
        <IncidentStats />
      </div>
      
      {/* Recent Patrols & Officers Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patrols */}
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
              Recent Patrols
            </h2>
            <Link 
              to="/patrols"
              className="btn-sm-outline"
            >
              View All
            </Link>
          </div>
          
          {dashboardData?.recentPatrols && dashboardData.recentPatrols.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recentPatrols.map(patrol => (
                <Link 
                  key={patrol._id} 
                  to={`/patrols/${patrol._id}`}
                  className="block p-3 bg-[#071425]/50 border border-blue-900/30 rounded-lg hover:bg-[#0a1c30]/50 transition-colors duration-200"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium text-blue-200">
                      Patrol at {patrol.locations?.[0]?.name || 'Unknown Location'}
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs border ${
                      patrol.status === 'active' 
                        ? 'bg-green-900/20 border-green-500/30 text-green-300' 
                        : patrol.status === 'completed'
                          ? 'bg-blue-900/20 border-blue-500/30 text-blue-300'
                          : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'
                    }`}>
                      {patrol.status}
                    </div>
                  </div>
                  <div className="text-sm text-blue-400">
                    Officer: {patrol.assignedOfficers?.[0]?.name || 'Unassigned'} • 
                    {patrol.endTime && ` • End: ${new Date(patrol.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-blue-400 py-8 text-center">No recent patrols found</div>
          )}
        </div>
        
        {/* Officers */}
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
              Officers
            </h2>
            <Link 
              to="/officers" 
              className="btn-sm-outline"
            >
              View All
            </Link>
          </div>
          
          {dashboardData?.officers && dashboardData.officers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dashboardData.officers.map(officer => (
                <div 
                  key={officer._id}
                  className="p-3 bg-[#071425]/50 border border-blue-900/30 rounded-lg"
                >
                  <div className="font-medium text-blue-200">{officer.name}</div>
                  <div className="text-sm text-blue-400">Badge: {officer.badgeNumber || 'N/A'}</div>
                  <div className="flex items-center mt-2">
                    <div className={`w-2 h-2 rounded-full mr-2 ${officer.isOnDuty ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                    <span className={officer.isOnDuty ? 'text-green-300' : 'text-gray-400'}>
                      {officer.isOnDuty ? 'On Duty' : 'Off Duty'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-blue-400 py-8 text-center">No officers found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 