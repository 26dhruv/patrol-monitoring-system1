import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { patrolService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { notifySuccess, notifyError, notifyWarning } from '../utils/notifications';
import Spinner from '../components/ui/Spinner';
import MapView from '../components/maps/MapView';
import OfficerTracker from '../components/OfficerTracker';

const PatrolDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, currentUser } = useAuth();
  const [patrol, setPatrol] = useState(null);
  const [patrolLogs, setPatrolLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchPatrolData = async () => {
      try {
        setLoading(true);
        const response = await patrolService.getPatrol(id);
        const { patrol, logs } = response.data.data;
        
        setPatrol(patrol);
        setPatrolLogs(logs);
      } catch (err) {
        console.error('Error fetching patrol:', err);
        setError('Failed to load patrol data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatrolData();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdateStatus('loading');
      const response = await patrolService.updatePatrolStatus(id, newStatus);
      setPatrol(response.data.data);
      setUpdateStatus('success');
      
      notifySuccess(`Patrol status updated to ${newStatus.replace('-', ' ')}`);
      
      // Reset status message after 3 seconds
      setTimeout(() => setUpdateStatus(null), 3000);
    } catch (err) {
      console.error('Error updating patrol status:', err);
      setUpdateStatus('error');
      
      notifyError('Failed to update patrol status');
      
      // Reset status message after 3 seconds
      setTimeout(() => setUpdateStatus(null), 3000);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this patrol? This action cannot be undone.')) {
      try {
        await patrolService.deletePatrol(id);
        notifySuccess('Patrol deleted successfully');
        navigate('/patrols');
      } catch (err) {
        console.error('Error deleting patrol:', err);
        notifyError('Failed to delete patrol. Please try again.');
        setError('Failed to delete patrol. Please try again.');
      }
    }
  };

  const handleStartPatrol = async () => {
    if (!window.confirm('Are you sure you want to start this patrol?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Get current position if available
      let coordinates = null;
      
      if (navigator.geolocation) {
        coordinates = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            (error) => {
              console.error('Geolocation error:', error);
              notifyWarning('Could not get your location. Starting patrol without location data.');
              resolve(null);
            }
          );
        });
      }
      
      await patrolService.startPatrol(id, coordinates);
      notifySuccess('Patrol started successfully');
      
      // Refresh patrol data
      const response = await patrolService.getPatrol(id);
      const { patrol, logs } = response.data.data;
      
      setPatrol(patrol);
      setPatrolLogs(logs);
      
    } catch (err) {
      console.error('Error starting patrol:', err);
      setError('Failed to start patrol. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCompleteCheckpoint = async (checkpointId) => {
    try {
      setLoading(true);
      
      // Get current position if available
      let coordinates = null;
      
      if (navigator.geolocation) {
        coordinates = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            (error) => {
              console.error('Geolocation error:', error);
              resolve(null);
            }
          );
        });
      }
      
      const notes = prompt('Add any notes about this checkpoint:');
      
      await patrolService.completeCheckpoint(id, checkpointId, {
        notes,
        coordinates
      });
      
      // Refresh patrol data
      const response = await patrolService.getPatrol(id);
      const { patrol, logs } = response.data.data;
      
      setPatrol(patrol);
      setPatrolLogs(logs);
      
    } catch (err) {
      console.error('Error completing checkpoint:', err);
      setError('Failed to complete checkpoint. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCompletePatrol = async () => {
    if (!window.confirm('Are you sure you want to complete this patrol?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Get current position if available
      let coordinates = null;
      
      if (navigator.geolocation) {
        coordinates = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            (error) => {
              console.error('Geolocation error:', error);
              resolve(null);
            }
          );
        });
      }
      
      const notes = prompt('Add any final notes for this patrol:');
      
      await patrolService.completePatrol(id, {
        notes,
        coordinates
      });
      
      // Refresh patrol data
      const response = await patrolService.getPatrol(id);
      const { patrol, logs } = response.data.data;
      
      setPatrol(patrol);
      setPatrolLogs(logs);
      
    } catch (err) {
      console.error('Error completing patrol:', err);
      setError('Failed to complete patrol. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !patrol) {
    return <Spinner size="lg" fullScreen />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link to="/patrols" className="text-primary-600 hover:underline">
          Back to Patrols
        </Link>
      </div>
    );
  }

  if (!patrol) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-xl font-semibold mb-2">Patrol Not Found</div>
        <p className="text-gray-600 mb-4">The patrol you're looking for doesn't exist or has been removed.</p>
        <Link to="/patrols" className="text-primary-600 hover:underline">
          Back to Patrols
        </Link>
      </div>
    );
  }

  const getStatusBadgeClass = (status) => {
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

  const isAssignedOfficer = patrol.assignedOfficers.some(
    officer => typeof officer === 'object' 
      ? officer._id === currentUser.id 
      : officer === currentUser.id
  );
  
  const isActivePatrol = patrol.status === 'in-progress';
  const isScheduledPatrol = patrol.status === 'scheduled';
  const isCompletedPatrol = patrol.status === 'completed' || patrol.status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900 border border-blue-900/30 p-4 rounded-lg shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-blue-300">{patrol.title}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(patrol.status)}`}>
              {patrol.status.replace('-', ' ')}
            </span>
          </div>
          <p className="text-blue-300/70 mt-1">
            ID: {patrol._id}
          </p>
        </div>
        
        <div className="flex gap-2">
          {hasRole(['admin', 'manager']) && (
            <>
              <Link to={`/patrols/${id}/edit`} className="btn btn-secondary">
                Edit
              </Link>
              <button 
                onClick={handleDelete} 
                className="btn btn-danger"
              >
                Delete
              </button>
            </>
          )}
          <Link to="/patrols" className="btn btn-outline">
            Back to List
          </Link>
        </div>
      </div>

      {/* Status update notification */}
      {updateStatus === 'loading' && (
        <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 flex items-center">
          <Spinner size="sm" className="mr-3" />
          <p className="text-blue-300">Updating patrol status...</p>
        </div>
      )}
      {updateStatus === 'success' && (
        <div className="bg-green-900/20 border-l-4 border-green-500 p-4">
          <p className="text-green-400">Patrol status updated successfully!</p>
        </div>
      )}
      {updateStatus === 'error' && (
        <div className="bg-red-900/20 border-l-4 border-red-500 p-4">
          <p className="text-red-400">Failed to update patrol status. Please try again.</p>
        </div>
      )}

      <div className="border-b border-blue-900/30">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            className={`${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-800/50'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setActiveTab('details')}
          >
            Patrol Details
          </button>
          <button
            type="button"
            className={`${
              activeTab === 'officers'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-800/50'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setActiveTab('officers')}
          >
            Officers
          </button>
          <button
            type="button"
            className={`${
              activeTab === 'checkpoints'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-800/50'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setActiveTab('checkpoints')}
          >
            Checkpoints
          </button>
          <button
            type="button"
            className={`${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-800/50'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setActiveTab('logs')}
          >
            Activity Logs
          </button>
          {isActivePatrol && (
            <button
              type="button"
              className={`${
                activeTab === 'tracking'
                  ? 'border-blue-500 text-blue-300'
                  : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-800/50'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('tracking')}
            >
              Live Tracking
            </button>
          )}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-blue-400">Description</h3>
              <p className="mt-1 text-blue-200">
                {patrol.description || 'No description provided.'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-blue-400">Start Time</h3>
                <p className="mt-1 text-blue-200">
                  {new Date(patrol.startTime).toLocaleString()}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-blue-400">End Time</h3>
                <p className="mt-1 text-blue-200">
                  {patrol.endTime ? new Date(patrol.endTime).toLocaleString() : 'Not completed yet'}
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-blue-400">Created By</h3>
              <p className="mt-1 text-blue-200">
                {patrol.assignedBy?.name || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'officers' && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">Assigned Officers</h2>
          
          {patrol.assignedOfficers.length === 0 ? (
            <div className="text-center py-4 text-blue-400">
              No officers assigned to this patrol.
            </div>
          ) : (
            <div className="space-y-4">
              {patrol.assignedOfficers.map((officer) => (
                <div key={officer._id} className="flex items-center p-4 bg-[#071425]/50 rounded-lg border border-blue-900/30">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center">
                      {officer.name?.charAt(0).toUpperCase() || 'O'}
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-200">{officer.name || 'Unknown Officer'}</p>
                    <p className="text-sm text-blue-400">{officer.email || ''}</p>
                  </div>
                  {officer.badgeNumber && (
                    <div className="ml-auto">
                      <span className="bg-blue-900/30 text-blue-300 py-1 px-2 rounded text-xs">
                        Badge: {officer.badgeNumber}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'checkpoints' && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">Patrol Checkpoints</h2>
          
          {!patrol.checkpoints || patrol.checkpoints.length === 0 ? (
            <div className="text-center py-4 text-blue-400">
              No checkpoints defined for this patrol.
            </div>
          ) : (
            <div className="space-y-4">
              {patrol.checkpoints.map((checkpoint) => (
                <div 
                  key={checkpoint._id} 
                  className={`p-4 rounded-lg border ${
                    checkpoint.status === 'completed' 
                      ? 'bg-green-900/10 border-green-500/30'
                      : checkpoint.status === 'missed'
                      ? 'bg-red-900/10 border-red-500/30'
                      : 'bg-[#071425]/50 border-blue-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-medium ${
                        checkpoint.status === 'completed' ? 'text-green-300' :
                        checkpoint.status === 'missed' ? 'text-red-300' :
                        'text-blue-200'
                      }`}>
                        {checkpoint.location?.name || 'Unnamed Checkpoint'}
                      </h3>
                      
                      <p className="text-sm text-blue-400 mt-1">
                        {checkpoint.location?.address || (checkpoint.location?.coordinates ? 
                          `${checkpoint.location.coordinates.latitude.toFixed(4)}, ${checkpoint.location.coordinates.longitude.toFixed(4)}` : 
                          'Coordinates not available')}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        checkpoint.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                        checkpoint.status === 'missed' ? 'bg-red-900/30 text-red-400' :
                        'bg-blue-900/30 text-blue-400'
                      }`}>
                        {checkpoint.status === 'completed' ? 'Completed' :
                         checkpoint.status === 'missed' ? 'Missed' :
                         'Pending'}
                      </span>
                      
                      {checkpoint.status === 'completed' && checkpoint.actualTime && (
                        <span className="text-xs text-blue-400 mt-1">
                          {new Date(checkpoint.actualTime).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isAssignedOfficer && isActivePatrol && checkpoint.status === 'pending' && (
                    <div className="mt-4">
                      <button
                        onClick={() => handleCompleteCheckpoint(checkpoint._id)}
                        className="btn-sm-outline w-full"
                      >
                        Check-in at this location
                      </button>
                    </div>
                  )}
                  
                  {checkpoint.notes && (
                    <div className="mt-3 p-2 bg-blue-900/10 rounded text-sm text-blue-300">
                      <span className="text-blue-400">Notes:</span> {checkpoint.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'logs' && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">Activity Logs</h2>
          
          {patrolLogs.length === 0 ? (
            <div className="text-center py-4 text-blue-400">
              No activity logs for this patrol yet.
            </div>
          ) : (
            <div className="space-y-4 relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-900/30"></div>
              
              {patrolLogs.map((log, index) => (
                <div key={log._id || index} className="ml-10 relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-10 mt-1.5 w-4 h-4 rounded-full bg-blue-500/30 border border-blue-500/50"></div>
                  
                  <div className="p-3 bg-[#071425]/50 rounded-lg border border-blue-900/30">
                    <div className="flex justify-between">
                      <span className="text-blue-300 font-medium">
                        {log.officer?.name || 'Unknown Officer'}
                      </span>
                      <span className="text-blue-400 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.action === 'check-in' ? 'bg-green-900/30 text-green-400' :
                        log.action === 'check-out' ? 'bg-red-900/30 text-red-400' :
                        'bg-blue-900/30 text-blue-400'
                      }`}>
                        {log.action === 'check-in' ? 'Checked In' :
                         log.action === 'check-out' ? 'Checked Out' :
                         log.action}
                      </span>
                      
                      {log.location && (
                        <span className="ml-2 text-sm text-blue-400">
                          at {log.location?.name || 'Unknown Location'}
                        </span>
                      )}
                    </div>
                    
                    {log.description && (
                      <p className="mt-2 text-sm text-blue-300">
                        {log.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'tracking' && isActivePatrol && (
        <OfficerTracker patrolId={id} />
      )}
    </div>
  );
};

export default PatrolDetailPage; 