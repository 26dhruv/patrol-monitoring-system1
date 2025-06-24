import { useState, useEffect } from 'react';
import { patrolService, userService } from '../services/api';
import Spinner from './ui/Spinner';

const OfficerTracker = ({ patrolId }) => {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch officer locations on load and at intervals
  useEffect(() => {
    const fetchOfficerLocations = async () => {
      try {
        setLoading(true);
        
        // If patrolId is provided, get officers for specific patrol
        let response;
        if (patrolId) {
          response = await patrolService.getPatrolOfficers(patrolId);
        } else {
          // Otherwise get all on-duty officers
          response = await userService.getOfficers({ status: 'on-duty' });
        }
        
        setOfficers(response.data.data);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error('Error fetching officer locations:', err);
        setError('Failed to load officer locations');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchOfficerLocations();
    
    // Set up interval for real-time updates
    const intervalId = setInterval(fetchOfficerLocations, 30000); // Update every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [patrolId]);

  if (loading && officers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="card-glass border border-blue-900/30 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-blue-900/30">
        <h2 className="text-xl font-semibold text-blue-300">Officer Locations</h2>
        {lastUpdated && (
          <p className="text-sm text-blue-400 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
      
      <div className="p-4">
        {officers.length === 0 ? (
          <div className="text-center py-8 text-blue-400">
            No active officers found.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Map placeholder - in a real implementation you would use a mapping library */}
            <div className="bg-[#071425]/50 rounded-lg border border-blue-900/30 h-64 flex items-center justify-center text-blue-400">
              <div className="text-center">
                <div className="text-5xl mb-2">🗺️</div>
                <p>Interactive map would be displayed here with officer locations</p>
                <p className="text-sm mt-2">Using OpenStreetMap with Leaflet for mapping</p>
              </div>
            </div>
            
            {/* Officer list */}
            <div className="space-y-2">
              {officers.map((officer) => (
                <div 
                  key={officer._id}
                  className="flex items-center p-3 bg-[#071425]/50 rounded-lg border border-blue-900/30"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center mr-3">
                    {officer.name ? officer.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="font-medium text-blue-200">{officer.name}</p>
                    <p className="text-sm text-blue-400">
                      {officer.lastLocation ? 
                        `${officer.lastLocation.coordinates?.latitude.toFixed(4)}, ${officer.lastLocation.coordinates?.longitude.toFixed(4)}` : 
                        'Location unknown'}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      officer.status === 'on-duty' ? 'bg-green-900/30 text-green-400' : 
                      officer.status === 'off-duty' ? 'bg-red-900/30 text-red-400' : 
                      'bg-yellow-900/30 text-yellow-400'
                    }`}>
                      {officer.status || 'Unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerTracker; 