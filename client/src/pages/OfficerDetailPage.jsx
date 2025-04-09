import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { userService, patrolService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const OfficerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [officer, setOfficer] = useState(null);
  const [patrols, setPatrols] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const fetchOfficerData = async () => {
      try {
        setLoading(true);
        
        // Fetch officer details
        const officerResponse = await userService.getUser(id);
        const officerData = officerResponse.data.data;
        
        // Make sure we're viewing an officer
        if (officerData.role !== 'officer') {
          throw new Error('User is not an officer');
        }
        
        setOfficer(officerData);
        
        // Fetch officer's patrols
        const patrolsResponse = await patrolService.getAllPatrols({
          assignedOfficer: id,
          limit: 5,
          sort: '-startTime',
        });
        
        setPatrols(patrolsResponse.data.data);
        
        // Fetch officer's activity logs
        const logsResponse = await userService.getUserLogs(id);
        setLogs(logsResponse.data.data);
        
      } catch (err) {
        console.error('Error fetching officer data:', err);
        setError('Failed to load officer data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOfficerData();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await userService.updateUserStatus(id, newStatus);
      
      // Update the officer in state
      setOfficer(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating officer status:', err);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'on-duty':
        return 'bg-green-100 text-green-800';
      case 'off-duty':
        return 'bg-gray-100 text-gray-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getPatrolStatusBadgeClass = (status) => {
    switch (status) {
      case 'in-progress':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <Spinner size="lg" fullScreen />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button 
          onClick={() => navigate('/officers')} 
          className="btn btn-primary"
        >
          Back to Officers List
        </button>
      </div>
    );
  }

  if (!officer) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Officer not found
        </div>
        <button 
          onClick={() => navigate('/officers')} 
          className="btn btn-primary"
        >
          Back to Officers List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center">
          <Link to="/officers" className="mr-2 text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{officer.name}</h1>
          <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(officer.status)}`}>
            {officer.status?.replace('-', ' ') || 'Active'}
          </span>
        </div>
        
        {hasRole(['admin', 'manager']) && (
          <div className="flex space-x-2">
            <Link
              to={`/officers/${id}/edit`}
              className="btn btn-outline flex items-center"
            >
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </Link>
            
            <div className="relative inline-block text-left">
              <button
                type="button"
                className="btn btn-outline flex items-center"
                onClick={() => {
                  const dropdown = document.getElementById('status-dropdown');
                  if (dropdown) {
                    dropdown.classList.toggle('hidden');
                  }
                }}
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Change Status
              </button>
              <div 
                id="status-dropdown"
                className="hidden origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
              >
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleStatusChange('on-duty');
                      document.getElementById('status-dropdown').classList.add('hidden');
                    }}
                  >
                    Set On Duty
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleStatusChange('off-duty');
                      document.getElementById('status-dropdown').classList.add('hidden');
                    }}
                  >
                    Set Off Duty
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    onClick={() => {
                      handleStatusChange('inactive');
                      document.getElementById('status-dropdown').classList.add('hidden');
                    }}
                  >
                    Set Inactive
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate(`/assign-patrol?officer=${id}`)}
              className="btn btn-primary flex items-center"
            >
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Assign Patrol
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`${
              activeTab === 'info'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setActiveTab('info')}
          >
            Officer Info
          </button>
          <button
            className={`${
              activeTab === 'patrols'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setActiveTab('patrols')}
          >
            Patrol History
          </button>
          <button
            className={`${
              activeTab === 'logs'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setActiveTab('logs')}
          >
            Activity Logs
          </button>
        </nav>
      </div>

      {/* Officer Info */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="card bg-white shadow-sm">
              <h2 className="text-lg font-medium mb-4">Officer Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                  <p className="mt-1 text-base text-gray-900">{officer.name}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1 text-base text-gray-900">{officer.email}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Badge Number</h3>
                  <p className="mt-1 text-base text-gray-900">{officer.badgeNumber || 'Not assigned'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Department</h3>
                  <p className="mt-1 text-base text-gray-900">{officer.department || 'Not assigned'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p className="mt-1 text-base text-gray-900">{officer.phone || 'Not provided'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(officer.status)}`}>
                      {officer.status?.replace('-', ' ') || 'Active'}
                    </span>
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Joined Date</h3>
                  <p className="mt-1 text-base text-gray-900">
                    {officer.createdAt 
                      ? new Date(officer.createdAt).toLocaleDateString() 
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="card bg-white shadow-sm">
              <h2 className="text-lg font-medium mb-4">Statistics</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Total Patrols</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{officer.stats?.totalPatrols || 0}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Completed Patrols</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{officer.stats?.completedPatrols || 0}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Active Streak</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{officer.stats?.activeStreak || 0} days</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Incidents Reported</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{officer.stats?.incidentsReported || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patrol History */}
      {activeTab === 'patrols' && (
        <div className="card bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Patrols</h2>
            <Link to={`/patrols?officer=${id}`} className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patrols.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                      No patrols found for this officer.
                    </td>
                  </tr>
                ) : (
                  patrols.map((patrol) => (
                    <tr key={patrol._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link to={`/patrols/${patrol._id}`} className="text-primary-600 hover:text-primary-900">
                          {patrol.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPatrolStatusBadgeClass(patrol.status)}`}>
                          {patrol.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(patrol.startTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {patrol.endTime ? new Date(patrol.endTime).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/patrols/${patrol._id}`} className="text-primary-600 hover:text-primary-900">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity Logs */}
      {activeTab === 'logs' && (
        <div className="card bg-white shadow-sm">
          <h2 className="text-lg font-medium mb-4">Activity Logs</h2>
          
          <div className="flow-root">
            <ul className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <li className="py-4 text-center text-gray-500">
                  No activity logs found for this officer.
                </li>
              ) : (
                logs.map((log) => (
                  <li key={log._id} className="py-4">
                    <div className="flex space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {log.action}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {log.description}
                        </p>
                        {log.patrolId && (
                          <div className="mt-2">
                            <Link to={`/patrols/${log.patrolId}`} className="text-xs text-primary-600 hover:text-primary-700">
                              View related patrol
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerDetailPage; 