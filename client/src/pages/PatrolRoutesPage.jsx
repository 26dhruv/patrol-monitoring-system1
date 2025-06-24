import { useState, useEffect } from 'react';
import { patrolRouteService } from '../services/api';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';

const PatrolRoutesPage = () => {
  const { hasRole } = useAuth();
  
  // Patrol routes state
  const [patrolRoutes, setPatrolRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fromLocation: '',
    toLocation: '',
    fromCoordinates: null,
    toCoordinates: null,
    notes: ''
  });
  
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Search suggestions state
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  
  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  
  // Common Ahmedabad places for fallback
  const commonAhmedabadPlaces = [
    { name: 'Ahmedabad Railway Station', lat: 23.0272644, lon: 72.6015853 },
    { name: 'Sabarmati Ashram', lat: 23.0601651, lon: 72.5806382 },
    { name: 'Law Garden', lat: 23.0225, lon: 72.5714 },
    { name: 'Satellite Road', lat: 23.0279564, lon: 72.5189752 },
    { name: 'Mansi Circle', lat: 23.0328215, lon: 72.5253767 },
    { name: 'ISRO Satellite Center', lat: 23.0330, lon: 72.5850 },
    { name: 'Gujarat High Court', lat: 23.0225, lon: 72.5714 },
    { name: 'Navrangpura', lat: 23.0225, lon: 72.5714 },
    { name: 'Vastrapur', lat: 23.0325, lon: 72.5250 },
    { name: 'Bodakdev', lat: 23.0225, lon: 72.5714 },
    { name: 'Paldi', lat: 23.0225, lon: 72.5714 },
    { name: 'Ellis Bridge', lat: 23.0225, lon: 72.5714 },
    { name: 'CG Road', lat: 23.0225, lon: 72.5714 },
    { name: 'SG Road', lat: 23.0225, lon: 72.5714 },
    { name: 'Satellite', lat: 23.0279564, lon: 72.5189752 },
    { name: 'Jodhpur', lat: 23.0244106, lon: 72.5302711 },
    { name: 'Ambawadi', lat: 23.0230941, lon: 72.5364734 },
    { name: 'Panjrapole', lat: 23.0241524, lon: 72.5324576 },
    { name: 'Ramdev Nagar', lat: 23.0279564, lon: 72.5189752 },
    { name: 'Vejalpur', lat: 23.0325, lon: 72.5250 },
    { name: 'Sabarmati', lat: 23.0601651, lon: 72.5806382 },
    { name: 'Maninagar', lat: 23.0272644, lon: 72.6015853 },
    { name: 'Revdi Bazar', lat: 23.0272644, lon: 72.6015853 },
    { name: 'Ashram Road', lat: 23.0601651, lon: 72.5806382 },
    { name: 'Judges Bunglow Road', lat: 23.0328215, lon: 72.5253767 }
  ];
  
  // Search for places using Nominatim (OpenStreetMap)
  const searchPlaces = async (query, setSuggestions) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    // Don't search if already searching the same query
    if (lastSearchQuery === query.trim()) {
      return;
    }
    
    // Don't search if already searching
    if (isSearching) {
      return;
    }
    
    try {
      setIsSearching(true);
      setLastSearchQuery(query.trim());
      
      // Try multiple search variations to find more places
      const searchVariations = [
        `${query}, Ahmedabad, Gujarat, India`,
        `${query} Ahmedabad`,
        `${query}, Gujarat, India`,
        `${query}`
      ];
      
      let allResults = [];
      
      // Search with each variation
      for (const searchQuery of searchVariations) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(searchQuery)}&` +
            `format=json&` +
            `limit=5&` +
            `addressdetails=1&` +
            `countrycodes=in&` +
            `bounded=1&` +
            `viewbox=72.4,22.9,72.8,23.2&` +
            `user-agent=patrol-monitoring-system`
          );
          
          if (response.ok) {
            const data = await response.json();
            allResults = [...allResults, ...data];
          }
        } catch (error) {
          console.error(`Error with search variation "${searchQuery}":`, error);
        }
      }
      
      // Remove duplicates and filter for Ahmedabad area
      const uniqueResults = allResults.filter((place, index, self) => 
        index === self.findIndex(p => p.place_id === place.place_id)
      );
      
      const ahmedabadResults = uniqueResults.filter(place => {
        const address = place.address || {};
        const displayName = place.display_name.toLowerCase();
        
        return (
          address.city === 'Ahmedabad' ||
          address.state_district === 'Ahmedabad' ||
          address.county === 'Ahmedabad' ||
          displayName.includes('ahmedabad') ||
          displayName.includes('gujarat') ||
          // Include places that might not have explicit Ahmedabad in address but are in the area
          (place.lat >= 22.9 && place.lat <= 23.2 && place.lon >= 72.4 && place.lon <= 72.8)
        );
      });
      
      // Sort by relevance (places with Ahmedabad in name first)
      const sortedResults = ahmedabadResults.sort((a, b) => {
        const aHasAhmedabad = a.display_name.toLowerCase().includes('ahmedabad');
        const bHasAhmedabad = b.display_name.toLowerCase().includes('ahmedabad');
        
        if (aHasAhmedabad && !bHasAhmedabad) return -1;
        if (!aHasAhmedabad && bHasAhmedabad) return 1;
        return 0;
      });
      
      // If no results found, provide common Ahmedabad places
      if (sortedResults.length === 0) {
        const matchingCommonPlaces = commonAhmedabadPlaces.filter(place =>
          place.name.toLowerCase().includes(query.toLowerCase())
        );
        
        if (matchingCommonPlaces.length > 0) {
          const fallbackResults = matchingCommonPlaces.map(place => ({
            place_id: `fallback_${place.name}`,
            display_name: place.name,
            lat: place.lat.toString(),
            lon: place.lon.toString(),
            type: 'fallback',
            address: { city: 'Ahmedabad', state: 'Gujarat', country: 'India' }
          }));
          setSuggestions(fallbackResults);
          return;
        }
      }
      
      setSuggestions(sortedResults.slice(0, 8));
    } catch (error) {
      console.error('Error searching places:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle location input change with debouncing
  const handleLocationInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Don't search for very short queries
    if (value.trim().length < 2) {
      if (field === 'fromLocation') {
        setFromSuggestions([]);
        setShowFromSuggestions(false);
      } else if (field === 'toLocation') {
        setToSuggestions([]);
        setShowToSuggestions(false);
      }
      return;
    }
    
    // Set new timeout for search with longer delay
    const timeout = setTimeout(() => {
      if (field === 'fromLocation') {
        searchPlaces(value, setFromSuggestions);
        setShowFromSuggestions(true);
      } else if (field === 'toLocation') {
        searchPlaces(value, setToSuggestions);
        setShowToSuggestions(true);
      }
    }, 800); // Increased from 500ms to 800ms
    
    setSearchTimeout(timeout);
  };
  
  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion, field) => {
    const locationName = suggestion.display_name.split(',')[0]; // Get first part of address
    const coordinates = {
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon)
    };
    
    setFormData(prev => ({
      ...prev,
      [field]: locationName,
      [`${field === 'fromLocation' ? 'from' : 'to'}Coordinates`]: coordinates
    }));
    
    // Hide suggestions
    if (field === 'fromLocation') {
      setShowFromSuggestions(false);
      setFromSuggestions([]);
    } else {
      setShowToSuggestions(false);
      setToSuggestions([]);
    }
  };
  
  // Fetch all patrol routes
  const fetchPatrolRoutes = async () => {
    try {
      setLoading(true);
      const response = await patrolRouteService.getAllPatrolRoutes();
      setPatrolRoutes(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching patrol routes:', err);
      setError('Failed to load patrol routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPatrolRoutes();
  }, []);
  
  // Filter patrol routes
  const filteredPatrolRoutes = patrolRoutes.filter(route => {
    const matchesSearch = route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         route.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Validate route uniqueness
  const validateRouteUniqueness = async () => {
    if (!formData.fromLocation || !formData.toLocation) {
      return { isValid: false, error: 'Please enter both from and to locations' };
    }

    if (formData.fromLocation === formData.toLocation) {
      return { isValid: false, error: 'From and to locations cannot be the same' };
    }

    // Check if route already exists
    const existingRoute = patrolRoutes.find(route => {
      const fromCheckpoint = route.checkpoints.find(cp => cp.name === formData.fromLocation);
      const toCheckpoint = route.checkpoints.find(cp => cp.name === formData.toLocation);
      return fromCheckpoint && toCheckpoint;
    });

    if (existingRoute) {
      return { 
        isValid: false, 
        error: `Route from "${formData.fromLocation}" to "${formData.toLocation}" already exists` 
      };
    }

    return { isValid: true };
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    if (!formData.name.trim()) {
      setFormError('Route name is required');
      return;
    }
    
    if (!formData.fromLocation || !formData.toLocation) {
      setFormError('Please enter both from and to locations');
      return;
    }
    
    if (!formData.fromCoordinates || !formData.toCoordinates) {
      setFormError('Please select valid locations from the suggestions');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setIsValidating(true);
      
      // Validate route uniqueness
      const validation = await validateRouteUniqueness();
      if (!validation.isValid) {
        setFormError(validation.error);
        return;
      }
      
      // Create patrol route data with coordinates
      const routeData = {
        name: formData.name,
        description: formData.description,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        fromCoordinates: formData.fromCoordinates,
        toCoordinates: formData.toCoordinates,
        notes: formData.notes
      };
      
      await patrolRouteService.createPatrolRoute(routeData);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        fromLocation: '',
        toLocation: '',
        fromCoordinates: null,
        toCoordinates: null,
        notes: ''
      });
      
      setFormSuccess('Patrol route created successfully!');
      fetchPatrolRoutes();
      
    } catch (err) {
      console.error('Error creating patrol route:', err);
      setFormError(err.response?.data?.error || 'Failed to create patrol route. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  };
  
  // Handle patrol route deletion
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this patrol route?')) {
      try {
        await patrolRouteService.deletePatrolRoute(id);
        fetchPatrolRoutes();
      } catch (err) {
        console.error('Error deleting patrol route:', err);
        setError('Failed to delete patrol route. Please try again.');
      }
    }
  };
  
  if (loading) {
    return <Spinner />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          Patrol Routes
        </h1>
      </div>

      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search patrol routes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-[#071425]/50 border border-blue-900/30 rounded-lg text-blue-300 placeholder-blue-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create Patrol Route Form */}
      {hasRole(['admin', 'manager']) && (
        <div className="bg-[#071425]/30 border border-blue-900/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">Create New Patrol Route</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-400 mb-2">
                  Route Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#071425]/50 border border-blue-900/30 rounded-lg text-blue-300 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Main Building to Parking Lot"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-400 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#071425]/50 border border-blue-900/30 rounded-lg text-blue-300 focus:outline-none focus:border-blue-500"
                  placeholder="Brief description of the route"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-blue-400 mb-2">
                  From Location * (Ahmedabad)
                </label>
                <input
                  type="text"
                  name="fromLocation"
                  value={formData.fromLocation}
                  onChange={(e) => handleLocationInputChange('fromLocation', e.target.value)}
                  onFocus={() => setShowFromSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                  className="w-full px-3 py-2 bg-[#071425]/50 border border-blue-900/30 rounded-lg text-blue-300 focus:outline-none focus:border-blue-500"
                  placeholder="Try: Railway Station, Satellite, Mansi, ISRO, CG Road..."
                />
                {formData.fromCoordinates && (
                  <p className="text-xs text-green-400 mt-1">
                    ✓ Coordinates: {formData.fromCoordinates.latitude.toFixed(6)}, {formData.fromCoordinates.longitude.toFixed(6)}
                  </p>
                )}
                {isSearching && formData.fromLocation && formData.fromLocation.length >= 2 && (
                  <p className="text-xs text-blue-400 mt-1">
                    🔍 Searching...
                  </p>
                )}
                
                {/* From Location Suggestions */}
                {showFromSuggestions && fromSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-[#071425] border border-blue-900/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {fromSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-blue-900/30 cursor-pointer text-blue-300 text-sm"
                        onClick={() => handleSuggestionSelect(suggestion, 'fromLocation')}
                      >
                        <div className="font-medium">{suggestion.display_name.split(',')[0]}</div>
                        <div className="text-blue-400 text-xs">
                          {suggestion.type === 'fallback' ? 
                            '📍 Common Ahmedabad location' : 
                            suggestion.display_name
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-blue-400 mb-2">
                  To Location * (Ahmedabad)
                </label>
                <input
                  type="text"
                  name="toLocation"
                  value={formData.toLocation}
                  onChange={(e) => handleLocationInputChange('toLocation', e.target.value)}
                  onFocus={() => setShowToSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                  className="w-full px-3 py-2 bg-[#071425]/50 border border-blue-900/30 rounded-lg text-blue-300 focus:outline-none focus:border-blue-500"
                  placeholder="Try: Law Garden, Sabarmati Ashram, Vastrapur, Bodakdev..."
                />
                {formData.toCoordinates && (
                  <p className="text-xs text-green-400 mt-1">
                    ✓ Coordinates: {formData.toCoordinates.latitude.toFixed(6)}, {formData.toCoordinates.longitude.toFixed(6)}
                  </p>
                )}
                {isSearching && formData.toLocation && formData.toLocation.length >= 2 && (
                  <p className="text-xs text-blue-400 mt-1">
                    🔍 Searching...
                  </p>
                )}
                
                {/* To Location Suggestions */}
                {showToSuggestions && toSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-[#071425] border border-blue-900/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {toSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-blue-900/30 cursor-pointer text-blue-300 text-sm"
                        onClick={() => handleSuggestionSelect(suggestion, 'toLocation')}
                      >
                        <div className="font-medium">{suggestion.display_name.split(',')[0]}</div>
                        <div className="text-blue-400 text-xs">
                          {suggestion.type === 'fallback' ? 
                            '📍 Common Ahmedabad location' : 
                            suggestion.display_name
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-400 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 bg-[#071425]/50 border border-blue-900/30 rounded-lg text-blue-300 focus:outline-none focus:border-blue-500"
                placeholder="Additional notes about this route"
              />
            </div>

            {/* Form messages */}
            {formError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                {formError}
              </div>
            )}
            
            {formSuccess && (
              <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
                {formSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || isValidating}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {isSubmitting ? 'Creating...' : isValidating ? 'Validating...' : 'Create Route'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Patrol Routes List */}
      <div className="bg-[#071425]/30 border border-blue-900/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-300 mb-4">Patrol Routes</h2>
        
        {filteredPatrolRoutes.length === 0 ? (
          <div className="text-center py-8 text-blue-400">
            No patrol routes found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatrolRoutes.map(route => (
              <div
                key={route._id}
                className="bg-[#071425]/50 border border-blue-900/30 rounded-lg p-4 hover:border-blue-700 transition-colors duration-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-blue-300">{route.name}</h3>
                </div>
                
                <p className="text-blue-400 text-sm mb-3">{route.description}</p>
                
                <div className="space-y-2 mb-3">
                  <div className="text-sm text-blue-400">
                    <span className="font-medium">From:</span> {route.checkpoints[0]?.name}
                  </div>
                  <div className="text-sm text-blue-400">
                    <span className="font-medium">To:</span> {route.checkpoints[route.checkpoints.length - 1]?.name}
                  </div>
                  <div className="text-sm text-blue-400">
                    <span className="font-medium">Duration:</span> {route.estimatedDuration} minutes
                  </div>
                  <div className="text-sm text-blue-400">
                    <span className="font-medium">Checkpoints:</span> {route.checkpoints.length}
                  </div>
                </div>
                
                {hasRole(['admin', 'manager']) && (
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleDelete(route._id)}
                      className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatrolRoutesPage; 