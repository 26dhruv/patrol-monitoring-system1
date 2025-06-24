import { useState, useEffect } from 'react';
import { locationService } from '../services/api';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';

const LocationsPage = () => {
  const { hasRole } = useAuth();
  
  // Locations state
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coordinates: {
      latitude: '',
      longitude: ''
    },
    address: '',
    geocodePlace: ''
  });
  
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Filter state
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Fetch all locations
  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await locationService.getAllLocations();
      setLocations(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to load locations. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLocations();
  }, []);
  
  // Filter locations
  const filteredLocations = activeFilter === 'all' 
    ? locations 
    : locations.filter(location => location.locationType === activeFilter);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'latitude' || name === 'longitude') {
      setFormData(prev => ({
        ...prev,
        coordinates: {
          ...prev.coordinates,
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle geocoding
  const handleGeocode = async () => {
    if (!formData.geocodePlace.trim()) {
      setFormError('Please enter a place name to geocode');
      return;
    }

    try {
      setIsGeocoding(true);
      setFormError(null);

      const response = await locationService.geocode(formData.geocodePlace);
      const { latitude, longitude, address } = response.data.data;

      setFormData(prev => ({
        ...prev,
        coordinates: {
          latitude: latitude.toString(),
          longitude: longitude.toString()
        },
        address: address
      }));

      setFormSuccess(`Successfully geocoded "${formData.geocodePlace}" to coordinates: ${latitude}, ${longitude}`);
    } catch (err) {
      console.error('Geocoding error:', err);
      setFormError(err.response?.data?.error || 'Failed to geocode place. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    if (!formData.name.trim()) {
      setFormError('Location name is required');
      return;
    }
    
    if (!formData.coordinates.latitude || !formData.coordinates.longitude) {
      setFormError('Coordinates are required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create location with properly structured data
      const locationData = {
        ...formData,
        coordinates: {
          latitude: Number(formData.coordinates.latitude),
          longitude: Number(formData.coordinates.longitude)
        }
      };
      
      await locationService.createLocation(locationData);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        coordinates: {
          latitude: '',
          longitude: ''
        },
        address: '',
        geocodePlace: ''
      });
      
      setFormSuccess('Location created successfully!');
      
      // Refresh locations list
      fetchLocations();
      
    } catch (err) {
      console.error('Error creating location:', err);
      setFormError(err.response?.data?.error || 'Failed to create location. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle location deletion
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        await locationService.deleteLocation(id);
        
        // Refresh locations list
        fetchLocations();
        
      } catch (err) {
        console.error('Error deleting location:', err);
        setError('Failed to delete location. Please try again.');
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          Checkpoint Locations
        </h1>
        
        {/* Filter buttons */}
        <div className="inline-flex rounded-md shadow-sm mt-4 md:mt-0">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
              activeFilter === 'all'
                ? 'bg-blue-900/30 text-blue-300 border-blue-700'
                : 'bg-[#071425]/50 text-blue-400 border-blue-900/30 hover:bg-[#0a1c30]/50'
            }`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b ${
              activeFilter === 'checkpoint'
                ? 'bg-blue-900/30 text-blue-300 border-blue-700'
                : 'bg-[#071425]/50 text-blue-400 border-blue-900/30 hover:bg-[#0a1c30]/50'
            }`}
            onClick={() => setActiveFilter('checkpoint')}
          >
            Checkpoints
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
              activeFilter === 'building'
                ? 'bg-blue-900/30 text-blue-300 border-blue-700'
                : 'bg-[#071425]/50 text-blue-400 border-blue-900/30 hover:bg-[#0a1c30]/50'
            }`}
            onClick={() => setActiveFilter('building')}
          >
            Buildings
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      {/* Create new location form - only for admins and managers */}
      {hasRole(['admin', 'manager']) && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">Add New Location</h2>
          
          {formError && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md mb-4">
              {formError}
            </div>
          )}
          
          {formSuccess && (
            <div className="bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-md mb-4">
              {formSuccess}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-blue-300 mb-1">
                  Location Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter location name"
                  required
                />
              </div>
              
              {/* Geocoding Section */}
              <div className="bg-[#0a1c30]/30 border border-blue-900/30 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-300 mb-3">📍 Geocoding (Ahmedabad District)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label htmlFor="geocodePlace" className="block text-sm font-medium text-blue-300 mb-1">
                      Place Name
                    </label>
                    <input
                      type="text"
                      id="geocodePlace"
                      name="geocodePlace"
                      value={formData.geocodePlace}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Satellite Ahmedabad, Law Garden, etc."
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleGeocode}
                      disabled={isGeocoding || !formData.geocodePlace.trim()}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors duration-200"
                    >
                      {isGeocoding ? 'Geocoding...' : 'Get Coordinates'}
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-blue-400">
                  💡 Tip: Enter place names like "Satellite Ahmedabad", "Law Garden", "ISRO", etc. to automatically get coordinates.
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="locationType" className="block text-sm font-medium text-blue-300 mb-1">
                Location Type
              </label>
              <select
                id="locationType"
                name="locationType"
                value={formData.locationType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="checkpoint">Checkpoint</option>
                <option value="building">Building</option>
                <option value="entrance">Entrance</option>
                <option value="perimeter">Perimeter</option>
                <option value="area">Area</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-blue-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="2"
                className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter location description"
              ></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-blue-300 mb-1">
                  Latitude*
                </label>
                <input
                  type="number"
                  step="any"
                  id="latitude"
                  name="latitude"
                  value={formData.coordinates.latitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter latitude"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-blue-300 mb-1">
                  Longitude*
                </label>
                <input
                  type="number"
                  step="any"
                  id="longitude"
                  name="longitude"
                  value={formData.coordinates.longitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter longitude"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-blue-300 mb-1">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter address"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  'Add Location'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Locations list */}
      <div className="card-glass border border-blue-900/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-300 mb-4">All Locations</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-8 text-blue-400">
            No locations found. {activeFilter !== 'all' && 'Try changing your filter or '} 
            {hasRole(['admin', 'manager']) ? 'add a new location above.' : 'Ask an admin to add locations.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map(location => (
              <div
                key={location._id}
                className="relative border border-blue-900/30 bg-[#071425]/50 rounded-lg overflow-hidden"
              >
                <div className="p-4">
                  <h3 className="text-lg font-medium text-blue-200 truncate">{location.name}</h3>
                  
                  <p className="mt-1 text-sm text-blue-400 line-clamp-2">
                    {location.description || 'No description provided'}
                  </p>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-400">Type:</span>{' '}
                      <span className="text-blue-300 capitalize">{location.locationType}</span>
                    </div>
                    
                    <div>
                      <span className="text-blue-400">Status:</span>{' '}
                      <span className={`${location.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <span className="text-blue-400 text-sm">Coordinates:</span>{' '}
                    <p className="text-blue-300 text-sm mt-1">
                      {location.address || (location.coordinates ? 
                        `${location.coordinates.latitude.toFixed(4)}, ${location.coordinates.longitude.toFixed(4)}` : 
                        'Coordinates not available')}
                    </p>
                  </div>
                </div>
                
                {hasRole(['admin', 'manager']) && (
                  <div className="border-t border-blue-900/30 bg-[#0a1c30]/50 p-2 flex justify-end space-x-2">
                    <button
                      className="px-3 py-1 rounded text-xs font-medium bg-blue-900/30 text-blue-300 hover:bg-blue-800/30"
                      onClick={() => {/* Edit location logic */}}
                    >
                      Edit
                    </button>
                    <button
                      className="px-3 py-1 rounded text-xs font-medium bg-red-900/30 text-red-300 hover:bg-red-800/30"
                      onClick={() => handleDelete(location._id)}
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

export default LocationsPage; 