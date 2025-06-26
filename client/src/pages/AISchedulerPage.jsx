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
  const [activeTab, setActiveTab] = useState('overview');

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
      setLoading(true);
      await Promise.all([
        loadSchedulingStats(),
        loadRecommendations(),
        loadOptimizationSuggestions()
      ]);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load initial data. Please refresh the page.');
    } finally {
      setLoading(false);
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
      setRecommendations(response.data.data || []);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  };

  const loadOptimizationSuggestions = async () => {
    try {
      const response = await aiSchedulerService.getOptimizationSuggestions();
      setOptimizationSuggestions(response.data.data || []);
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
      } else {
        setSuccess('Parameters validated successfully!');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-blue-500">
              🤖 AI Patrol Scheduler
            </h1>
            <p className="text-blue-300 mt-2 text-lg">
              Intelligent patrol route optimization and assignment
            </p>
          </div>
          <button 
            onClick={() => navigate('/patrols')}
            className="btn-outline bg-blue-900/30 border-blue-500/50 text-blue-300 hover:bg-blue-800/50"
          >
            View All Patrols
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'scheduler', label: 'AI Scheduler', icon: '⚙️' },
            { id: 'results', label: 'Results', icon: '📋' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-md transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-600/50 text-blue-200 shadow-lg'
                  : 'text-blue-400 hover:text-blue-300 hover:bg-slate-700/50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-6 py-4 rounded-lg backdrop-blur-sm">
            <div className="flex items-center">
              <span className="text-xl mr-3">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-500/30 text-green-400 px-6 py-4 rounded-lg backdrop-blur-sm">
            <div className="flex items-center">
              <span className="text-xl mr-3">✅</span>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Overview */}
            {schedulingStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="card-glass border border-blue-900/30 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-blue-300">{schedulingStats.patrols.total}</div>
                      <div className="text-sm text-blue-400">Total Patrols</div>
                    </div>
                    <div className="text-2xl">🚔</div>
                  </div>
                </div>
                <div className="card-glass border border-green-900/30 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-300">{schedulingStats.routes.total}</div>
                      <div className="text-sm text-blue-400">Active Routes</div>
                    </div>
                    <div className="text-2xl">🗺️</div>
                  </div>
                </div>
                <div className="card-glass border border-purple-900/30 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-purple-300">{schedulingStats.officers.available}</div>
                      <div className="text-sm text-blue-400">Available Officers</div>
                    </div>
                    <div className="text-2xl">👮</div>
                  </div>
                </div>
                <div className="card-glass border border-red-900/30 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-red-300">{schedulingStats.incidents.open}</div>
                      <div className="text-sm text-blue-400">Open Incidents</div>
                    </div>
                    <div className="text-2xl">🚨</div>
                  </div>
                </div>
                <div className="card-glass border border-yellow-900/30 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-yellow-300">{schedulingStats.recommendations.optimalRoutes}</div>
                      <div className="text-sm text-blue-400">Recommended Routes</div>
                    </div>
                    <div className="text-2xl">🎯</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="card-glass border border-blue-900/30 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-2xl font-semibold text-blue-300 mb-6 flex items-center">
                  <span className="mr-3">📋</span>
                  AI Recommendations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getPriorityBg(rec.priority)} backdrop-blur-sm`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-medium ${getPriorityColor(rec.priority)}`}>
                            {rec.type.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-blue-200 text-sm mt-2">{rec.message}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)} bg-slate-800/50`}>
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
              <div className="card-glass border border-blue-900/30 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-2xl font-semibold text-blue-300 mb-6 flex items-center">
                  <span className="mr-3">⚡</span>
                  Real-time Optimization
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {optimizationSuggestions.map((suggestion, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getPriorityBg(suggestion.priority)} backdrop-blur-sm`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-medium ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.type.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-blue-200 text-sm mt-2">{suggestion.message}</p>
                          <p className="text-blue-400 text-xs mt-2">Distance: {suggestion.distance.toFixed(1)}km</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)} bg-slate-800/50`}>
                          {suggestion.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Scheduler Tab */}
        {activeTab === 'scheduler' && (
          <div className="card-glass border border-blue-900/30 rounded-xl p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold text-blue-300 mb-6 flex items-center">
              <span className="mr-3">⚙️</span>
              Generate AI Patrol Assignments
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Basic Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-blue-300">Basic Settings</h3>
                
                <div>
                  <label htmlFor="maxRoutes" className="block text-sm font-medium text-blue-300 mb-2">
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
                    className="w-full px-4 py-3 border border-blue-900/30 rounded-lg shadow-sm text-blue-100 bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                  />
                  <p className="text-xs text-blue-400 mt-2">
                    Recommended: {schedulingStats?.recommendations.optimalRoutes || 5}
                  </p>
                </div>

                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-blue-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-blue-900/30 rounded-lg shadow-sm text-blue-100 bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-blue-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-blue-900/30 rounded-lg shadow-sm text-blue-100 bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                  />
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-blue-300">Advanced Options</h3>
                
                <div className="space-y-4">
                  <label className="flex items-start p-4 rounded-lg border border-blue-900/30 bg-slate-800/30 backdrop-blur-sm hover:bg-slate-700/30 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      name="autoCreate"
                      checked={formData.autoCreate}
                      onChange={handleInputChange}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-blue-300">Auto Create Patrols</span>
                      <p className="text-xs text-blue-400 mt-1">Automatically create patrol assignments in the system</p>
                    </div>
                  </label>

                  <label className="flex items-start p-4 rounded-lg border border-blue-900/30 bg-slate-800/30 backdrop-blur-sm hover:bg-slate-700/30 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      name="includeIncidentAreas"
                      checked={formData.includeIncidentAreas}
                      onChange={handleInputChange}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-blue-300">Include Incident Areas</span>
                      <p className="text-xs text-blue-400 mt-1">Create routes for active incidents</p>
                    </div>
                  </label>

                  <label className="flex items-start p-4 rounded-lg border border-blue-900/30 bg-slate-800/30 backdrop-blur-sm hover:bg-slate-700/30 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      name="createMissingRoutes"
                      checked={formData.createMissingRoutes}
                      onChange={handleInputChange}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-blue-300">Create Missing Routes</span>
                      <p className="text-xs text-blue-400 mt-1">Dynamically create routes for uncovered incident areas</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-blue-300">Actions</h3>
                
                <div className="space-y-4">
                  <button
                    onClick={validateParams}
                    disabled={loading}
                    className="w-full btn-secondary bg-slate-700/50 border-slate-600/50 text-blue-300 hover:bg-slate-600/50 backdrop-blur-sm"
                  >
                    {loading ? <Spinner size="sm" /> : 'Validate Parameters'}
                  </button>

                  <button
                    onClick={generateAssignments}
                    disabled={loading}
                    className="w-full btn-primary bg-blue-600/50 border-blue-500/50 text-white hover:bg-blue-500/50 backdrop-blur-sm"
                  >
                    {loading ? <Spinner size="sm" /> : 'Generate Assignments'}
                  </button>

                  {generatedAssignments && !formData.autoCreate && (
                    <button
                      onClick={handleCreatePatrols}
                      disabled={loading}
                      className="w-full btn-success bg-green-600/50 border-green-500/50 text-white hover:bg-green-500/50 backdrop-blur-sm"
                    >
                      {loading ? <Spinner size="sm" /> : 'Create Patrols'}
                    </button>
                  )}
                </div>

                {/* Validation Results */}
                {validation && (
                  <div className="p-4 rounded-lg border border-blue-900/30 bg-slate-800/30 backdrop-blur-sm">
                    <h3 className="font-medium text-blue-300 mb-3">Validation Results</h3>
                    {validation.errors.length > 0 && (
                      <div className="text-red-400 text-sm mb-3">
                        <strong>Errors:</strong>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {validation.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validation.warnings.length > 0 && (
                      <div className="text-yellow-400 text-sm">
                        <strong>Warnings:</strong>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {validation.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && generatedAssignments && (
          <div className="card-glass border border-blue-900/30 rounded-xl p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold text-blue-300 mb-6 flex items-center">
              <span className="mr-3">📋</span>
              Generated Patrol Assignments
            </h2>
            
            {/* Summary */}
            <div className="mb-8 p-6 bg-blue-900/20 rounded-lg border border-blue-500/30 backdrop-blur-sm">
              <h3 className="font-medium text-blue-300 mb-4 text-lg">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">{generatedAssignments.summary.totalAssignments}</div>
                  <div className="text-blue-400">Total Assignments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-300">
                    {typeof generatedAssignments.summary.coverage === 'number' ? generatedAssignments.summary.coverage.toFixed(1) : 'N/A'}%
                  </div>
                  <div className="text-blue-400">Coverage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-300">
                    {typeof generatedAssignments.summary.averageScore === 'number' ? generatedAssignments.summary.averageScore.toFixed(2) : 'N/A'}
                  </div>
                  <div className="text-blue-400">Average Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-300">{generatedAssignments.summary.totalOfficers}</div>
                  <div className="text-blue-400">Total Officers</div>
                </div>
                {generatedAssignments.summary.routesCreated > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-300">{generatedAssignments.summary.routesCreated}</div>
                    <div className="text-blue-400">Routes Created</div>
                  </div>
                )}
              </div>
            </div>

            {/* Assignments */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-blue-300">Assignments</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {generatedAssignments.assignments.map((assignment, index) => (
                  <div key={index} className="p-6 border border-blue-900/30 rounded-lg bg-slate-800/30 backdrop-blur-sm hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-blue-300 text-lg">{assignment.route.name}</h4>
                        <p className="text-sm text-blue-400">Assigned to: {assignment.officer.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-300">
                          {typeof assignment.score === 'number' ? assignment.score.toFixed(2) : 'N/A'}
                        </div>
                        <div className="text-xs text-blue-400">Priority Score</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-400">Incidents Nearby:</span>
                        <span className="text-blue-200">{assignment.incidentPriority?.incidentCount ?? 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-400">Route Efficiency:</span>
                        <span className="text-blue-200">
                          {typeof assignment.efficiency?.efficiency === 'number' ? assignment.efficiency.efficiency.toFixed(2) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-400">Time Multiplier:</span>
                        <span className="text-blue-200">
                          {typeof assignment.timeMultiplier === 'number' ? assignment.timeMultiplier.toFixed(1) + 'x' : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-blue-900/30 text-xs text-blue-400">
                      <div className="flex justify-between">
                        <span>Start: {assignment.startTime ? new Date(assignment.startTime).toLocaleString() : 'N/A'}</span>
                        <span>End: {assignment.endTime ? new Date(assignment.endTime).toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Newly Created Routes */}
            {generatedAssignments.newlyCreatedRoutes && generatedAssignments.newlyCreatedRoutes.length > 0 && (
              <div className="mt-8 p-6 bg-green-900/20 border border-green-500/30 rounded-lg backdrop-blur-sm">
                <h3 className="font-medium text-green-300 mb-4 text-lg flex items-center">
                  <span className="mr-2">🆕</span>
                  Newly Created Routes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedAssignments.newlyCreatedRoutes.map((routeInfo, index) => (
                    <div key={index} className="p-4 bg-green-900/10 border border-green-500/20 rounded-lg backdrop-blur-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-green-300">{routeInfo.route.name}</h4>
                          <p className="text-sm text-green-400">{routeInfo.route.description}</p>
                          <p className="text-xs text-green-500 mt-2">Reason: {routeInfo.reason}</p>
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
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800/90 p-8 rounded-xl border border-blue-500/30">
              <div className="flex items-center space-x-4">
                <Spinner size="lg" />
                <div className="text-blue-300 text-lg">Processing...</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISchedulerPage; 