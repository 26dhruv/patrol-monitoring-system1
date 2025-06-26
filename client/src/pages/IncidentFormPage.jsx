import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { incidentService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const IncidentFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  // Only treat as edit mode if ID is present and not 'new'
  const isEditMode = Boolean(id) && id !== 'new';
  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [officers, setOfficers] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    area: '',
    locationName: '',
    coordinates: {
      latitude: '',
      longitude: ''
    },
    date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    time: new Date().toTimeString().slice(0, 5), // Current time in HH:MM format
    severity: 'medium',
    category: '',
    witnesses: [{
      name: '',
      contact: '',
      statement: ''
    }],
    involvedPersons: [{
      name: '',
      description: '',
      role: 'other'
    }],
    assignedTo: [],
  });
  
  // Search suggestions state
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
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
  
  // Fetch locations and officers on component mount
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        // Fetch officers
        const officersResponse = await userService.getOfficers();
        setOfficers(officersResponse.data.data);
        
        // If in edit mode and ID is not 'new', fetch the incident data
        if (isEditMode && id !== 'new') {
          const incidentResponse = await incidentService.getIncident(id);
          const incident = incidentResponse.data.data;
          
          // Format date and time
          const incidentDate = new Date(incident.date);
          const formattedDate = incidentDate.toISOString().split('T')[0];
          
          // Populate form data
          setFormData({
            title: incident.title || '',
            description: incident.description || '',
            area: incident.area || '',
            locationName: incident.area || '',
            coordinates: {
              latitude: incident.coordinates?.latitude || '',
              longitude: incident.coordinates?.longitude || ''
            },
            date: formattedDate,
            time: incident.time || '',
            severity: incident.severity || 'medium',
            category: incident.category || '',
            witnesses: incident.witnesses?.length > 0 ? incident.witnesses : [{
              name: '',
              contact: '',
              statement: ''
            }],
            involvedPersons: incident.involvedPersons?.length > 0 ? incident.involvedPersons : [{
              name: '',
              description: '',
              role: 'other'
            }],
            assignedTo: incident.assignedTo?.map(officer => officer._id) || [],
          });
        }
      } catch (err) {
        console.error('Error fetching form data:', err);
        setError('Failed to load form data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFormData();
  }, [id, isEditMode]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Search for places using Nominatim (OpenStreetMap)
  const searchPlaces = async (query) => {
    if (!query.trim() || query.length < 2) {
      setLocationSuggestions([]);
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
          setLocationSuggestions(fallbackResults);
          return;
        }
      }
      
      setLocationSuggestions(sortedResults.slice(0, 8));
    } catch (error) {
      console.error('Error searching places:', error);
      setLocationSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle location input change with debouncing
  const handleLocationInputChange = (value) => {
    setFormData(prev => ({ ...prev, locationName: value }));
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Don't search for very short queries
    if (value.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    
    // Set new timeout for search
    const timeout = setTimeout(() => {
      searchPlaces(value);
      setShowLocationSuggestions(true);
    }, 800);
    
    setSearchTimeout(timeout);
  };
  
  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    const locationName = suggestion.display_name.split(',')[0]; // Get first part of address
    const coordinates = {
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon)
    };
    
    setFormData(prev => ({
      ...prev,
      locationName: locationName,
      coordinates: coordinates,
      area: locationName // Use location name as area
    }));
    
    // Hide suggestions
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };
  
  const handleMultiSelectChange = (e) => {
    const { name, options } = e.target;
    const selectedValues = Array.from(options)
      .filter(option => option.selected)
      .map(option => option.value);
    
    setFormData(prev => ({
      ...prev,
      [name]: selectedValues
    }));
  };
  
  const handleWitnessChange = (index, field, value) => {
    const updatedWitnesses = [...formData.witnesses];
    updatedWitnesses[index] = {
      ...updatedWitnesses[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      witnesses: updatedWitnesses
    }));
  };
  
  const handleInvolvedPersonChange = (index, field, value) => {
    const updatedInvolvedPersons = [...formData.involvedPersons];
    updatedInvolvedPersons[index] = {
      ...updatedInvolvedPersons[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      involvedPersons: updatedInvolvedPersons
    }));
  };
  
  const addWitness = () => {
    setFormData(prev => ({
      ...prev,
      witnesses: [
        ...prev.witnesses,
        {
          name: '',
          contact: '',
          statement: ''
        }
      ]
    }));
  };
  
  const removeWitness = (index) => {
    if (formData.witnesses.length <= 1) return;
    
    const updatedWitnesses = [...formData.witnesses];
    updatedWitnesses.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      witnesses: updatedWitnesses
    }));
  };
  
  const addInvolvedPerson = () => {
    setFormData(prev => ({
      ...prev,
      involvedPersons: [
        ...prev.involvedPersons,
        {
          name: '',
          description: '',
          role: 'other'
        }
      ]
    }));
  };
  
  const removeInvolvedPerson = (index) => {
    if (formData.involvedPersons.length <= 1) return;
    
    const updatedInvolvedPersons = [...formData.involvedPersons];
    updatedInvolvedPersons.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      involvedPersons: updatedInvolvedPersons
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.area.trim()) {
        throw new Error('Area is required. Please geocode a location name or enter area manually.');
      }

      // Filter out empty witnesses and involved persons
      const filteredWitnesses = formData.witnesses.filter(w => w.name.trim() !== '');
      const filteredInvolvedPersons = formData.involvedPersons.filter(p => p.name.trim() !== '');
      
      // Format date as ISO string if it's not already
      let formattedDate = formData.date;
      if (formData.date && !formData.date.includes('T')) {
        formattedDate = new Date(formData.date).toISOString().split('T')[0];
      }

      // Prepare the incident data
      const incidentData = {
        ...formData,
        date: formattedDate,
        witnesses: filteredWitnesses,
        involvedPersons: filteredInvolvedPersons,
        // Convert coordinates to numbers if they exist
        coordinates: formData.coordinates.latitude && formData.coordinates.longitude ? {
          latitude: parseFloat(formData.coordinates.latitude),
          longitude: parseFloat(formData.coordinates.longitude)
        } : undefined
      };
      
      console.log('Submitting incident data:', incidentData);
      
      // Determine if creating or updating
      let response;
      if (isEditMode) {
        console.log('Updating incident with ID:', id);
        response = await incidentService.updateIncident(id, incidentData);
      } else {
        console.log('Creating new incident');
        response = await incidentService.createIncident(incidentData);
      }
      
      console.log('Submission successful:', response.data);
      setSuccess(true);
      
      // Navigate to incident detail page after successful submission
      setTimeout(() => {
        navigate(`/incidents/${response.data.data._id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error submitting incident:', err);
      if (err.message) {
        // Client-side validation error
        setError(err.message);
      } else {
        // Server-side error
        console.error('Error details:', err.response?.data);
        setError(err.response?.data?.msg || err.response?.data?.message || 'Failed to submit incident. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <Spinner size="lg" fullScreen />;
  }
  
  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          {isEditMode ? 'Edit Incident' : 'Report New Incident'}
        </h1>
        
        <Link
          to="/incidents"
          className="px-4 py-2 border border-blue-500/30 rounded-md text-blue-300 hover:bg-blue-900/30 hover:text-blue-200 focus:outline-none transition-colors duration-200"
        >
          Back to Incidents
        </Link>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-md mb-4">
          {isEditMode ? 'Incident updated successfully!' : 'Incident reported successfully!'}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-glass rounded-lg border border-blue-900/30 p-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-300">Incident Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-blue-300 mb-1">Incident Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Brief title describing the incident"
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-blue-300 mb-1">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select Category</option>
                  <option value="security">Security</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="medical">Medical</option>
                  <option value="fire">Fire</option>
                  <option value="theft">Theft</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="trespassing">Trespassing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="severity" className="block text-sm font-medium text-blue-300 mb-1">Severity</label>
                <select
                  id="severity"
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="locationName" className="block text-sm font-medium text-blue-300 mb-1">Location</label>
                <div className="relative">
                  <input
                    type="text"
                    id="locationName"
                    name="locationName"
                    value={formData.locationName}
                    onChange={(e) => handleLocationInputChange(e.target.value)}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Try: Railway Station, Satellite, Mansi, ISRO, CG Road..."
                  />
                  {formData.coordinates.latitude && formData.coordinates.longitude && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Coordinates: {formData.coordinates.latitude}, {formData.coordinates.longitude}
                    </p>
                  )}
                  {isSearching && formData.locationName && formData.locationName.length >= 2 && (
                    <p className="text-xs text-blue-400 mt-1">
                      🔍 Searching...
                    </p>
                  )}
                  
                  {/* Location Suggestions */}
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#071425] border border-blue-900/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {locationSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-blue-900/30 cursor-pointer text-blue-300 text-sm"
                          onClick={() => handleSuggestionSelect(suggestion)}
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
                <p className="text-xs text-blue-400 mt-1">Enter a location name to search for places in Ahmedabad</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-blue-300 mb-1">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-blue-300 mb-1">Time</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              {hasRole(['admin', 'manager']) && (
                <div>
                  <label htmlFor="assignedTo" className="block text-sm font-medium text-blue-300 mb-1">
                    Assign to Officers
                    <span className="text-xs text-blue-300/70 ml-1">(Hold Ctrl/Cmd to select multiple)</span>
                  </label>
                  <select
                    id="assignedTo"
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleMultiSelectChange}
                    multiple
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm h-32"
                  >
                    {officers.map(officer => (
                      <option key={officer._id} value={officer._id}>
                        {officer.name} - {officer.badgeNumber || 'No Badge'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-blue-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Detailed description of what happened"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Witnesses Section */}
        <div className="card-glass rounded-lg border border-blue-900/30 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-300">Witnesses</h2>
            <button
              type="button"
              onClick={addWitness}
              className="btn-sm-outline"
            >
              Add Witness
            </button>
          </div>
          
          {formData.witnesses.map((witness, index) => (
            <div key={index} className="p-4 border border-blue-900/30 rounded-lg mb-4 bg-[#071425]/30">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium text-blue-300">Witness #{index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeWitness(index)}
                  className="text-red-400 hover:text-red-300 text-sm"
                  disabled={formData.witnesses.length <= 1}
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={witness.name}
                    onChange={(e) => handleWitnessChange(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Witness name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">Contact Information</label>
                  <input
                    type="text"
                    value={witness.contact}
                    onChange={(e) => handleWitnessChange(index, 'contact', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Phone number or email"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-300 mb-1">Statement</label>
                <textarea
                  value={witness.statement}
                  onChange={(e) => handleWitnessChange(index, 'statement', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Witness statement"
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Involved Persons Section */}
        <div className="card-glass rounded-lg border border-blue-900/30 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-300">People Involved</h2>
            <button
              type="button"
              onClick={addInvolvedPerson}
              className="btn-sm-outline"
            >
              Add Person
            </button>
          </div>
          
          {formData.involvedPersons.map((person, index) => (
            <div key={index} className="p-4 border border-blue-900/30 rounded-lg mb-4 bg-[#071425]/30">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium text-blue-300">Person #{index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeInvolvedPerson(index)}
                  className="text-red-400 hover:text-red-300 text-sm"
                  disabled={formData.involvedPersons.length <= 1}
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={person.name}
                    onChange={(e) => handleInvolvedPersonChange(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Person's name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">Role</label>
                  <select
                    value={person.role}
                    onChange={(e) => handleInvolvedPersonChange(index, 'role', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="victim">Victim</option>
                    <option value="suspect">Suspect</option>
                    <option value="witness">Witness</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-300 mb-1">Description</label>
                <textarea
                  value={person.description}
                  onChange={(e) => handleInvolvedPersonChange(index, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Description of the person and their involvement"
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end space-x-4">
          <Link
            to="/incidents"
            className="px-4 py-2 border border-blue-500/30 rounded-md text-blue-300 hover:bg-blue-900/30 hover:text-blue-200 focus:outline-none transition-colors duration-200"
          >
            Cancel
          </Link>
          
          <button
            type="submit"
            className="btn-primary px-6"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Submitting...
              </>
            ) : isEditMode ? 'Update Incident' : 'Report Incident'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncidentFormPage; 