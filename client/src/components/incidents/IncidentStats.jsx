import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentService } from '../../services/api';
import Spinner from '../ui/Spinner';

const IncidentStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // The API now handles role-based filtering automatically
        const response = await incidentService.getIncidentStats();
        setStats(response.data.data);
      } catch (err) {
        console.error('Error fetching incident stats:', err);
        setError('Failed to load incident statistics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  if (loading) {
    return (
      <div className="card-glass border border-blue-900/30 rounded-lg p-6 w-full h-60 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="card-glass border border-blue-900/30 rounded-lg p-6 w-full">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="card-glass border border-blue-900/30 rounded-lg p-6 w-full">
        <div className="text-blue-400">No statistics available</div>
      </div>
    );
  }

  // Helper functions for styling
  const getSeverityColorClass = (severity) => {
    switch (severity) {
      case 'low':
        return 'bg-green-900/20 border-green-500/30 text-green-300';
      case 'medium':
        return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300';
      case 'high':
        return 'bg-orange-900/20 border-orange-500/30 text-orange-300';
      case 'critical':
        return 'bg-red-900/20 border-red-500/30 text-red-300';
      default:
        return 'bg-blue-900/20 border-blue-500/30 text-blue-300';
    }
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-900/20 border-blue-500/30 text-blue-300';
      case 'in-progress':
        return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300';
      case 'resolved':
        return 'bg-green-900/20 border-green-500/30 text-green-300';
      case 'closed':
        return 'bg-gray-900/20 border-gray-500/30 text-gray-300';
      default:
        return 'bg-blue-900/20 border-blue-500/30 text-blue-300';
    }
  };

  // Determine the title based on user role
  const getTitle = () => {
    if (stats.userRole === 'officer') {
      return 'My Incident Statistics';
    } else if (stats.userRole === 'manager') {
      return 'Team Incident Statistics';
    } else {
      return 'Incident Statistics';
    }
  };

  // Determine the total incidents title
  const getTotalTitle = () => {
    if (stats.userRole === 'officer') {
      return 'My Total Incidents';
    } else if (stats.userRole === 'manager') {
      return 'Team Total Incidents';
    } else {
      return 'Total Incidents';
    }
  };

  // Determine the recent incidents title
  const getRecentTitle = () => {
    if (stats.userRole === 'officer') {
      return 'My Recent Incidents';
    } else if (stats.userRole === 'manager') {
      return 'Team Recent Incidents';
    } else {
      return 'Recent Incidents';
    }
  };

  return (
    <div className="card-glass border border-blue-900/30 rounded-lg p-6 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          {getTitle()}
        </h2>
        <Link
          to="/incidents"
          className="btn-sm-outline"
        >
          View All
        </Link>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#071425]/50 border border-blue-900/30 rounded-lg p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-blue-300 mb-1">{stats.total}</div>
          <div className="text-sm text-blue-400">{getTotalTitle()}</div>
        </div>
        
        <div className="bg-[#071425]/50 border border-purple-900/30 rounded-lg p-4 text-center ">
          <div className="text-2xl md:text-3xl font-bold text-purple-300 mb-1">{stats.statusCounts?.new || 0}</div>
          <div className="text-sm text-blue-400">New</div>
        </div>
        
        <div className="bg-[#071425]/50 border border-yellow-900/30 rounded-lg p-4 text-center ">
          <div className="text-2xl md:text-3xl font-bold text-yellow-300 mb-1">{stats.statusCounts?.["in-progress"] || 0}</div>
          <div className="text-sm text-blue-400">In Progress</div>
        </div>
        
        <div className="bg-[#071425]/50 border border-green-900/30 rounded-lg p-4 text-center ">
          <div className="text-2xl md:text-3xl font-bold text-green-300 mb-1">{stats.statusCounts?.resolved || 0}</div>
          <div className="text-sm text-blue-400">Resolved</div>
        </div>
      </div>
      
      {/* Recent Incidents */}
      {stats.recentIncidents && stats.recentIncidents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-blue-300 mb-3">
            {getRecentTitle()}
          </h3>
          <div className="space-y-3">
            {stats.recentIncidents.map((incident) => (
              <Link
                key={incident._id}
                to={`/incidents/${incident._id}`}
                className="block p-3 bg-[#071425]/50 border border-blue-900/30 rounded-lg hover:bg-[#0a1c30]/50 transition-colors duration-200"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-blue-200">{incident.title}</div>
                  <div className={`px-2 py-0.5 rounded text-xs border capitalize ${getSeverityColorClass(incident.severity)}`}>
                    {incident.severity}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-400">
                    {new Date(incident.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs border capitalize ${getStatusColorClass(incident.status)}`}>
                    {incident.status.replace('-', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Only show distribution charts for admin/manager view */}
      {stats.userRole !== 'officer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Category Distribution */}
          {stats.categoryCounts && Object.keys(stats.categoryCounts).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-3">Categories</h3>
              <div className="space-y-2">
                {Object.entries(stats.categoryCounts).map(([category, count]) => (
                  <div key={category} className="flex items-center">
                    <div className="w-32 text-sm capitalize text-blue-300">{category}</div>
                    <div className="flex-1 bg-blue-900/20 rounded-full h-2.5 mr-2">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-blue-400 w-8 text-right">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Severity Distribution */}
          {stats.severityCounts && Object.keys(stats.severityCounts).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-3">Severity</h3>
              <div className="space-y-2">
                {Object.entries(stats.severityCounts).map(([severity, count]) => {
                  let gradientClass = '';
                  
                  switch (severity) {
                    case 'low':
                      gradientClass = 'from-green-400 to-green-600';
                      break;
                    case 'medium':
                      gradientClass = 'from-yellow-400 to-yellow-600';
                      break;
                    case 'high':
                      gradientClass = 'from-orange-400 to-orange-600';
                      break;
                    case 'critical':
                      gradientClass = 'from-red-400 to-red-600';
                      break;
                    default:
                      gradientClass = 'from-blue-400 to-blue-600';
                  }
                  
                  return (
                    <div key={severity} className="flex items-center">
                      <div className="w-32 text-sm capitalize text-blue-300">{severity}</div>
                      <div className="flex-1 bg-blue-900/20 rounded-full h-2.5 mr-2">
                        <div 
                          className={`bg-gradient-to-r ${gradientClass} h-2.5 rounded-full`}
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-blue-400 w-8 text-right">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IncidentStats; 