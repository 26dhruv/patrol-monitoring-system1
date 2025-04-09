import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for marker icons in Leaflet with React
// This is needed because of how bundlers handle assets
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapView = ({ patrols = [], center = [40.7128, -74.0060], zoom = 13 }) => {
  const [markers, setMarkers] = useState([]);
  const processedRef = useRef(false);
  
  // Process patrol data once to create map markers
  useEffect(() => {
    // Skip if already processed or no patrols with locations
    if (processedRef.current || !patrols || patrols.length === 0) {
      return;
    }
    
    // Process patrol data to create map markers
    const patrolMarkers = patrols
      .filter(patrol => patrol.locations && patrol.locations.length > 0)
      .map(patrol => {
        // Get the latest location
        const lastLocation = patrol.locations[patrol.locations.length - 1];
        
        return {
          id: patrol._id || patrol.id,
          position: [lastLocation.latitude, lastLocation.longitude],
          title: patrol.title || patrol.name,
          details: {
            status: patrol.status,
            officer: patrol.assignedOfficers?.[0]?.name || patrol.officer?.name || 'Unassigned',
            time: new Date(lastLocation.timestamp).toLocaleTimeString(),
          }
        };
      });
    
    if (patrolMarkers.length > 0) {
      setMarkers(patrolMarkers);
      processedRef.current = true;
    }
  }, [patrols]);

  // If no patrol data with locations, display a message
  if (patrols.length > 0 && markers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[#071425]/50 rounded-lg border border-blue-900/30">
        <p className="text-blue-300/70">No active patrol locations to display</p>
      </div>
    );
  }

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%' }}
      className="z-0 rounded-lg bg-[#071425]/30"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {markers.map(marker => (
        <Marker key={marker.id} position={marker.position}>
          <Popup>
            <div className="text-sm bg-[#071425] text-blue-100 p-2 rounded">
              <h3 className="font-semibold text-blue-300">{marker.title}</h3>
              <p className="mt-1">Officer: {marker.details.officer}</p>
              <p>Status: <span className="capitalize">{marker.details.status.replace('-', ' ')}</span></p>
              <p>Last Updated: {marker.details.time}</p>
              <button 
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                onClick={() => window.open(`/patrols/${marker.id}`, '_blank')}
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView; 