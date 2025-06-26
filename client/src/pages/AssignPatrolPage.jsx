import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { patrolService, userService, patrolRouteService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const AssignPatrolPage = ({ assignOfficersOnly = false, checkpointsOnly = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialOfficerId = searchParams.get('officer');
  const { hasRole } = useAuth();
  
  const isEditMode = !!id;
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    status: 'scheduled',
    assignedOfficers: [],
    patrolRoute: '',
    priority: 'medium',
    notes: ''
  });
  
  // Loading states
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Available officers
  const [officers, setOfficers] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(true);
  
  // Available patrol routes
  const [patrolRoutes, setPatrolRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // Tab navigation
  const [currentTab, setCurrentTab] = useState(
    assignOfficersOnly ? 'officers' : 
    checkpointsOnly ? 'routes' : 
    'details'
  );
  
  // Fetch patrol data if in edit mode
  useEffect(() => {
    const fetchPatrolData = async () => {
      if (!isEditMode) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await patrolService.getPatrol(id);
        const { patrol: patrolData } = response.data.data;
        
        // Format dates for form inputs
        const formattedData = {
          ...patrolData,
          startTime: patrolData.startTime ? new Date(patrolData.startTime).toISOString().slice(0, 16) : '',
          endTime: patrolData.endTime ? new Date(patrolData.endTime).toISOString().slice(0, 16) : '',
          // Convert assignedOfficers from objects to IDs if necessary
          assignedOfficers: Array.isArray(patrolData.assignedOfficers) 
            ? patrolData.assignedOfficers.map(officer => typeof officer === 'object' ? officer._id : officer) 
            : [],
        };
        
        setFormData(formattedData);
        
        // Set selected route if patrol has a route
        if (patrolData.patrolRoute) {
          const routeId = patrolData.patrolRoute._id || patrolData.patrolRoute;
          setFormData(prev => ({ ...prev, patrolRoute: routeId }));
          setSelectedRoute(patrolData.patrolRoute);
          console.log('Setting patrol route:', routeId, patrolData.patrolRoute);
        }
        
      } catch (err) {
        console.error('Error fetching patrol data:', err);
        setError('Failed to load patrol data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatrolData();
  }, [id, isEditMode]);
  
  // Fetch available officers
  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        setLoadingOfficers(true);
        const response = await userService.getOfficers({ status: 'on-duty', role: 'officer' });
        setOfficers(response.data.data);
        
        // If initialOfficerId is provided, add it to assigned officers
        if (initialOfficerId && !isEditMode) {
          setFormData(prev => ({
            ...prev,
            assignedOfficers: [...prev.assignedOfficers, initialOfficerId]
          }));
        }
        
      } catch (err) {
        console.error('Error fetching officers:', err);
      } finally {
        setLoadingOfficers(false);
      }
    };
    
    fetchOfficers();
  }, [initialOfficerId, isEditMode]);
  
  // Fetch available patrol routes
  useEffect(() => {
    const fetchPatrolRoutes = async () => {
      try {
        setLoadingRoutes(true);
        const response = await patrolRouteService.getAllPatrolRoutes({ isActive: true });
        setPatrolRoutes(response.data.data);
      } catch (err) {
        console.error('Error fetching patrol routes:', err);
      } finally {
        setLoadingRoutes(false);
      }
    };
    
    fetchPatrolRoutes();
  }, []);
  
  // Update selectedRoute when patrolRoutes are loaded and we have a patrolRoute in formData
  useEffect(() => {
    if (patrolRoutes.length > 0 && formData.patrolRoute && !selectedRoute) {
      const route = patrolRoutes.find(r => r._id === formData.patrolRoute);
      if (route) {
        setSelectedRoute(route);
        console.log('Found and set selected route:', route);
      }
    }
  }, [patrolRoutes, formData.patrolRoute, selectedRoute]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle officer selection
  const handleOfficerToggle = (officerId) => {
    setFormData(prev => {
      const isSelected = prev.assignedOfficers.includes(officerId);
      
      if (isSelected) {
        return {
          ...prev,
          assignedOfficers: prev.assignedOfficers.filter(id => id !== officerId)
        };
      } else {
        return {
          ...prev,
          assignedOfficers: [...prev.assignedOfficers, officerId]
        };
      }
    });
  };
  
  // Handle patrol route selection
  const handleRouteSelection = (routeId) => {
    setFormData(prev => ({ ...prev, patrolRoute: routeId }));
    
    // Set selected route for display
    const route = patrolRoutes.find(r => r._id === routeId);
    setSelectedRoute(route);
  };
  
  // Form validation
  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Please enter a patrol title');
      return false;
    }
    
    if (!formData.startTime) {
      setError('Please set a start time');
      return false;
    }
    
    if (new Date(formData.startTime) < new Date()) {
      setError('Start time cannot be in the past');
      return false;
    }
    
    if (formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
      setError('End time must be after start time');
      return false;
    }
    
    if (formData.assignedOfficers.length === 0) {
      setError('Please assign at least one officer');
      return false;
    }
    
    if (!formData.patrolRoute) {
      setError('Please select a patrol route');
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      const patrolData = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
      };
      
      if (isEditMode) {
        await patrolService.updatePatrol(id, patrolData);
        setSuccess('Patrol updated successfully!');
      } else {
        await patrolService.createPatrol(patrolData);
        setSuccess('Patrol assigned successfully!');
      }
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/patrols');
      }, 1500);
      
    } catch (err) {
      console.error('Error saving patrol:', err);
      setError(err.response?.data?.error || 'Failed to save patrol. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle tab navigation
  const handleNextTab = () => {
    if (currentTab === 'details') {
      setCurrentTab('officers');
    } else if (currentTab === 'officers') {
      setCurrentTab('routes');
    }
  };
  
  const handlePrevTab = () => {
    if (currentTab === 'routes') {
      setCurrentTab('officers');
    } else if (currentTab === 'officers') {
      setCurrentTab('details');
    }
  };
  
  if (loading) {
    return <Spinner size="lg" fullScreen />;
  }
  
  // Only admin and managers can access this page
  if (!hasRole(['admin', 'manager'])) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          You don't have permission to access this page.
        </div>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn btn-primary"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          {isEditMode ? 'Edit Patrol' : 'Assign New Patrol'}
        </h1>
      </div>
      
      {/* Success message */}
      {success && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-md mb-4">
          {success}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {/* Tab navigation */}
      <div className="border-b border-blue-900/30">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            className={`${
              currentTab === 'details'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-800/50'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setCurrentTab('details')}
            disabled={assignOfficersOnly || checkpointsOnly}
          >
            Patrol Details
          </button>
          <button
            type="button"
            className={`${
              currentTab === 'officers'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-800/50'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setCurrentTab('officers')}
            disabled={checkpointsOnly}
          >
            Assign Officers
          </button>
          <button
            type="button"
            className={`${
              currentTab === 'routes'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-blue-400 hover:text-blue-300 hover:border-blue-800/50'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            onClick={() => setCurrentTab('routes')}
            disabled={assignOfficersOnly}
          >
            Patrol Routes
          </button>
        </nav>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Patrol Details Tab */}
        {currentTab === 'details' && (
          <div className="card-glass border border-blue-900/30 rounded-lg p-6">
            <div className="space-y-4">
              <div className="form-group">
                <label htmlFor="title" className="block text-sm font-medium text-blue-300 mb-1">Patrol Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter patrol title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description" className="block text-sm font-medium text-blue-300 mb-1">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  rows="3"
                  placeholder="Enter patrol description"
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="status" className="block text-sm font-medium text-blue-300 mb-1">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="startTime" className="block text-sm font-medium text-blue-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="endTime" className="block text-sm font-medium text-blue-300 mb-1">End Time (Optional)</label>
                  <input
                    type="datetime-local"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="btn-primary"
                onClick={handleNextTab}
              >
                Next: Assign Officers
              </button>
            </div>
          </div>
        )}
        
        {/* Assign Officers Tab */}
        {currentTab === 'officers' && (
          <div className="card-glass border border-blue-900/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-300 mb-4">Assign Officers</h2>
            
            {loadingOfficers ? (
              <div className="flex justify-center py-4">
                <Spinner size="md" />
              </div>
            ) : officers.length === 0 ? (
              <div className="py-4 text-center text-blue-400">
                No on-duty officers available. Please try again later.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {officers.map(officer => (
                    <div
                      key={officer._id}
                      className={`rounded-lg p-4 cursor-pointer transition-colors duration-200 ${
                        formData.assignedOfficers.includes(officer._id)
                          ? 'border border-blue-500/50 bg-blue-900/30'
                          : 'border border-blue-900/30 bg-[#071425]/50 hover:bg-[#0a1c30]/50'
                      }`}
                      onClick={() => handleOfficerToggle(officer._id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center">
                            {officer.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-200 truncate">
                            {officer.name}
                          </p>
                          <p className="text-sm text-blue-400 truncate">
                            {officer.badgeNumber || 'No Badge'}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            className="form-checkbox text-blue-500 border-blue-700 rounded focus:ring-blue-500 focus:ring-offset-blue-900"
                            checked={formData.assignedOfficers.includes(officer._id)}
                            onChange={() => {}} // Handled by the onClick on the div
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-2 text-sm text-blue-400">
                  {formData.assignedOfficers.length === 0
                    ? 'No officers selected'
                    : `${formData.assignedOfficers.length} officer${formData.assignedOfficers.length !== 1 ? 's' : ''} selected`}
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                className="btn-outline"
                onClick={handlePrevTab}
              >
                Back: Patrol Details
              </button>
              
              <button
                type="button"
                className="btn-primary"
                onClick={handleNextTab}
              >
                Next: Patrol Routes
              </button>
            </div>
          </div>
        )}
        
        {/* Patrol Routes Tab */}
        {currentTab === 'routes' && (
          <div className="card-glass border border-blue-900/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-300 mb-4">Select Patrol Route</h2>
            
            {loadingRoutes ? (
              <div className="flex justify-center py-4">
                <Spinner size="md" />
              </div>
            ) : patrolRoutes.length === 0 ? (
              <div className="py-4 text-center text-blue-400">
                No patrol routes available. Please add routes first.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patrolRoutes.map(route => (
                    <div
                      key={route._id}
                      className={`rounded-lg p-4 cursor-pointer transition-colors duration-200 ${
                        formData.patrolRoute === route._id
                          ? 'border border-blue-500/50 bg-blue-900/30'
                          : 'border border-blue-900/30 bg-[#071425]/50 hover:bg-[#0a1c30]/50'
                      }`}
                      onClick={() => handleRouteSelection(route._id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-200 truncate">
                            {route.name}
                          </p>
                          <p className="text-sm text-blue-400 truncate">
                            {route.description || 'No description available'}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            className="form-checkbox text-blue-500 border-blue-700 rounded focus:ring-blue-500 focus:ring-offset-blue-900"
                            checked={formData.patrolRoute === route._id}
                            onChange={() => {}} // Handled by the onClick on the div
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-2 text-sm text-blue-400">
                  {formData.patrolRoute ? (
                    `Selected route: ${selectedRoute.name}`
                  ) : 'No route selected'}
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                className="btn-outline"
                onClick={handlePrevTab}
              >
                Back: Assign Officers
              </button>
              
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  isEditMode ? 'Update Patrol' : 'Create Patrol'
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default AssignPatrolPage; 