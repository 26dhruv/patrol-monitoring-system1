import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiSchedulerService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const AISchedulerPage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  // State for form data
  const [formData, setFormData] = useState({
    maxRoutes: 5,
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16),
    autoCreate: false,
    includeIncidentAreas: true,
    createMissingRoutes: false
  });

  // State for results and loading
  const [schedulingStats, setSchedulingStats] = useState(null);
  const [generatedAssignments, setGeneratedAssignments] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validation, setValidation] = useState(null);

  // Check if user has permission
  const canAccess = hasRole(['admin', 'manager']);

  useEffect(() => {
    if (!canAccess) {
      navigate('/dashboard');
      return;
    }

    // Load initial data
    loadInitialData();
  }, [canAccess, navigate]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadSchedulingStats(),
        loadRecommendations(),
        loadOptimizationSuggestions()
      ]);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const loadSchedulingStats = async () => {
    try {
      const response = await aiSchedulerService.getSchedulingStats();
      setSchedulingStats(response.data.data);
    } catch (err) {
      console.error('Error loading scheduling stats:', err);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await aiSchedulerService.getSchedulingRecommendations();
      setRecommendations(response.data.data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  };

  const loadOptimizationSuggestions = async () => {
    try {
      const response = await aiSchedulerService.getOptimizationSuggestions();
      setOptimizationSuggestions(response.data.data);
    } catch (err) {
      console.error('Error loading optimization suggestions:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateParams = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await aiSchedulerService.validateSchedulingParams(formData);
      setValidation(response.data.data);
      
      if (!response.data.data.isValid) {
        setError('Please fix the validation errors before generating assignments.');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError('Failed to validate parameters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setGeneratedAssignments(null);

      const response = await aiSchedulerService.generatePatrolAssignments(formData);
      setGeneratedAssignments(response.data.data);
      
      if (formData.autoCreate && response.data.data.createdCount > 0) {
        setSuccess(`Successfully generated and created ${response.data.data.createdCount} patrol assignments!`);
      } else {
        setSuccess(`Successfully generated ${response.data.data.assignments.length} patrol assignments!`);
      }

      // Show information about newly created routes
      if (formData.createMissingRoutes && response.data.data.newlyCreatedRoutes?.length > 0) {
        setSuccess(prev => prev + ` Created ${response.data.data.newlyCreatedRoutes.length} new routes to cover incident areas.`);
      }

      // Refresh data
      await loadInitialData();
    } catch (err) {
      console.error('Error generating assignments:', err);
      setError(err.response?.data?.error || 'Failed to generate patrol assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatrols = async () => {
    if (!generatedAssignments) return;

    try {
      setLoading(true);
      setError(null);

      const response = await aiSchedulerService.generatePatrolAssignments({
        ...formData,
        autoCreate: true
      });

      setSuccess(`Successfully created ${response.data.data.createdCount} patrol assignments!`);
      setGeneratedAssignments(response.data.data);
      
      // Refresh data
      await loadInitialData();
    } catch (err) {
      console.error('Error creating patrols:', err);
      setError('Failed to create patrol assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  const getPriorityBg = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-900/20 border-red-500/30';
      case 'medium': return 'bg-yellow-900/20 border-yellow-500/30';
      case 'low': return 'bg-green-900/20 border-green-500/30';
      default: return 'bg-blue-900/20 border-blue-500/30';
    }
  };

  if (!canAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          🤖 AI Patrol Scheduler
        </h1>
        <button 
          onClick={() => navigate('/patrols')}
          className="btn-outline"
        >
          View All Patrols
        </button>
      </div>

      {/* Stats Overview */}
      {schedulingStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card-glass border border-blue-900/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-300">{schedulingStats.patrols.total}</div>
            <div className="text-sm text-blue-400">Total Patrols</div>
          </div>
          <div className="card-glass border border-green-900/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-300">{schedulingStats.routes.total}</div>
            <div className="text-sm text-blue-400">Active Routes</div>
          </div>
          <div className="card-glass border border-purple-900/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-300">{schedulingStats.officers.available}</div>
            <div className="text-sm text-blue-400">Available Officers</div>
          </div>
          <div className="card-glass border border-red-900/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-300">{schedulingStats.incidents.open}</div>
            <div className="text-sm text-blue-400">Open Incidents</div>
          </div>
          <div className="card-glass border border-yellow-900/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-300">{schedulingStats.recommendations.optimalRoutes}</div>
            <div className="text-sm text-blue-400">Recommended Routes</div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">📋 AI Recommendations</h2>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className={`p-3 rounded-md border ${getPriorityBg(rec.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`font-medium ${getPriorityColor(rec.priority)}`}>
                      {rec.type.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-blue-200 text-sm mt-1">{rec.message}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Suggestions */}
      {optimizationSuggestions.length > 0 && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">⚡ Real-time Optimization</h2>
          <div className="space-y-3">
            {optimizationSuggestions.map((suggestion, index) => (
              <div key={index} className={`p-3 rounded-md border ${getPriorityBg(suggestion.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`font-medium ${getPriorityColor(suggestion.priority)}`}>
                      {suggestion.type.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-blue-200 text-sm mt-1">{suggestion.message}</p>
                    <p className="text-blue-400 text-xs mt-1">Distance: {suggestion.distance.toFixed(1)}km</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                    {suggestion.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* AI Scheduler Form */}
      <div className="card-glass border border-blue-900/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-300 mb-4">Generate AI Patrol Assignments</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="maxRoutes" className="block text-sm font-medium text-blue-300 mb-1">
              Maximum Routes
            </label>
            <input
              type="number"
              id="maxRoutes"
              name="maxRoutes"
              min="1"
              max="10"
              value={formData.maxRoutes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-blue-400 mt-1">Recommended: {schedulingStats?.recommendations.optimalRoutes || 5}</p>
          </div>

          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-blue-300 mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-blue-300 mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="autoCreate"
              checked={formData.autoCreate}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm text-blue-300">Automatically create patrol assignments</span>
          </label>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="includeIncidentAreas"
              checked={formData.includeIncidentAreas}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm text-blue-300">Include incident areas in patrol routes (creates routes for active incidents)</span>
          </label>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="createMissingRoutes"
              checked={formData.createMissingRoutes}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm text-blue-300">Dynamically create routes for incident areas not covered by existing routes</span>
          </label>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={validateParams}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? <Spinner size="sm" /> : 'Validate Parameters'}
          </button>

          <button
            onClick={generateAssignments}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? <Spinner size="sm" /> : 'Generate Assignments'}
          </button>

          {generatedAssignments && !formData.autoCreate && (
            <button
              onClick={handleCreatePatrols}
              disabled={loading}
              className="btn-success"
            >
              {loading ? <Spinner size="sm" /> : 'Create Patrols'}
            </button>
          )}
        </div>

        {/* Validation Results */}
        {validation && (
          <div className="mt-4 p-4 rounded-md border">
            <h3 className="font-medium text-blue-300 mb-2">Validation Results</h3>
            {validation.errors.length > 0 && (
              <div className="text-red-400 text-sm mb-2">
                <strong>Errors:</strong>
                <ul className="list-disc list-inside ml-2">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="text-yellow-400 text-sm">
                <strong>Warnings:</strong>
                <ul className="list-disc list-inside ml-2">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generated Assignments */}
      {generatedAssignments && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">Generated Patrol Assignments</h2>
          
          <div className="mb-4 p-4 bg-blue-900/20 rounded-md">
            <h3 className="font-medium text-blue-300 mb-2">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-400">Total Assignments:</span>
                <span className="text-blue-200 ml-2">{generatedAssignments.summary.totalAssignments}</span>
              </div>
              <div>
                <span className="text-blue-400">Coverage:</span>
                <span className="text-blue-200 ml-2">{typeof generatedAssignments.summary.coverage === 'number' ? generatedAssignments.summary.coverage.toFixed(1) : 'N/A'}%</span>
              </div>
              <div>
                <span className="text-blue-400">Average Score:</span>
                <span className="text-blue-200 ml-2">{typeof generatedAssignments.summary.averageScore === 'number' ? generatedAssignments.summary.averageScore.toFixed(2) : 'N/A'}</span>
              </div>
              <div>
                <span className="text-blue-400">Total Officers:</span>
                <span className="text-blue-200 ml-2">{generatedAssignments.summary.totalOfficers}</span>
              </div>
              {generatedAssignments.summary.routesCreated > 0 && (
                <div>
                  <span className="text-blue-400">Routes Created:</span>
                  <span className="text-blue-200 ml-2">{generatedAssignments.summary.routesCreated}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {generatedAssignments.assignments.map((assignment, index) => (
              <div key={index} className="p-4 border border-blue-900/30 rounded-md">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-blue-300">{assignment.route.name}</h4>
                    <p className="text-sm text-blue-400">Assigned to: {assignment.officer.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-300">{typeof assignment.score === 'number' ? assignment.score.toFixed(2) : 'N/A'}</div>
                    <div className="text-xs text-blue-400">Priority Score</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-400">Incidents Nearby:</span>
                    <span className="text-blue-200 ml-2">{assignment.incidentPriority?.incidentCount ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-blue-400">Route Efficiency:</span>
                    <span className="text-blue-200 ml-2">{typeof assignment.efficiency?.efficiency === 'number' ? assignment.efficiency.efficiency.toFixed(2) : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-blue-400">Time Multiplier:</span>
                    <span className="text-blue-200 ml-2">{typeof assignment.timeMultiplier === 'number' ? assignment.timeMultiplier.toFixed(1) + 'x' : 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-blue-400">
                  <span>Start: {assignment.startTime ? new Date(assignment.startTime).toLocaleString() : 'N/A'}</span>
                  <span className="mx-2">•</span>
                  <span>End: {assignment.endTime ? new Date(assignment.endTime).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Newly Created Routes */}
          {generatedAssignments.newlyCreatedRoutes && generatedAssignments.newlyCreatedRoutes.length > 0 && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-md">
              <h3 className="font-medium text-green-300 mb-3">Newly Created Routes</h3>
              <div className="space-y-3">
                {generatedAssignments.newlyCreatedRoutes.map((routeInfo, index) => (
                  <div key={index} className="p-3 bg-green-900/10 border border-green-500/20 rounded-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-green-300">{routeInfo.route.name}</h4>
                        <p className="text-sm text-green-400">{routeInfo.route.description}</p>
                        <p className="text-xs text-green-500 mt-1">Reason: {routeInfo.reason}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-green-400">Incident: {routeInfo.incident.title}</div>
                        <div className="text-xs text-green-500">{routeInfo.incident.severity} severity</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
          </div>
        </div>
      )}
    </div>
  );
};

export default AISchedulerPage; 