import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import { Loader } from '../common/Loader';
import { Map, MapPin, AlertCircle } from 'react-feather';

const getColorIntensity = (count, max) => {
  const ratio = Math.min(count / (max || 1), 1);
  return Math.floor(255 - (ratio * 200)); 
};

const LocationHeatmapItem = ({ location, count, maxCount, issues }) => {
  const [expanded, setExpanded] = useState(false);
  
  const bgColor = `rgb(255, ${getColorIntensity(count, maxCount)}, ${getColorIntensity(count, maxCount)})`;
  
  return (
    <div 
      className="mb-2 border rounded-md overflow-hidden"
      style={{ borderColor: bgColor }}
    >
      <div 
        className="flex justify-between items-center p-3 cursor-pointer"
        style={{ backgroundColor: bgColor }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <MapPin className="mr-2" size={18} />
          <span className="font-medium">{location}</span>
        </div>
        <div className="flex items-center">
          <span className="mr-2 bg-white bg-opacity-70 px-2 py-0.5 rounded-full text-sm">
            {count} issues
          </span>
          <button className="p-1 rounded-full hover:bg-white hover:bg-opacity-20">
            {expanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {expanded && issues && issues.length > 0 && (
        <div className="p-3 bg-white">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Issues by type:</h4>
          <div className="space-y-1">
            {issues.map((issue, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="capitalize">{issue.type}</span>
                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                  {issue.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const LocationHeatmap = ({ eventId, height = 'auto' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [locations, setLocations] = useState([]);
  
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch location heatmap data
        const data = await analyticsService.getLocationHeatmap(eventId);
        
        setHeatmapData(data.heatmap || []);
        setLocations(data.locations || []);
      } catch (err) {
        console.error('Error fetching location data:', err);
        setError('Failed to load location data');
      } finally {
        setLoading(false);
      }
    };
    
    if (eventId) {
      fetchLocationData();
    }
  }, [eventId]);
  
  if (loading) {
    return <Loader className="h-48 flex items-center justify-center" />;
  }
  
  if (error) {
    return (
      <div className="text-red-500 h-48 flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }
  
  if (heatmapData.length === 0) {
    return (
      <div className="text-gray-500 h-48 flex items-center justify-center">
        <p>No location data available</p>
      </div>
    );
  }
  
  // Find maximum count for color scaling
  const maxCount = Math.max(...heatmapData.map(item => item.count));
  
  return (
    <div className={`${height !== 'auto' ? `h-${height}` : ''} overflow-y-auto`}>
      <div className="bg-gray-50 p-4 rounded-lg mb-4 flex items-center text-sm text-gray-600">
        <Map className="mr-2 text-blue-500" size={18} />
        <p>
          This heatmap shows the distribution of issues across different areas of your event. 
          Redder areas indicate more issues reported in that location.
        </p>
      </div>
      
      {locations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Mapped Areas:</h4>
          <div className="flex flex-wrap gap-2">
            {locations.map((location, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {location}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {heatmapData.map((item, index) => (
          <LocationHeatmapItem 
            key={index}
            location={item.location}
            count={item.count}
            maxCount={maxCount}
            issues={item.issues}
          />
        ))}
      </div>
      
      {heatmapData.length > 0 && heatmapData[0].count >= 5 && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="mr-2" size={18} />
          <p className="text-sm">
            <strong>{heatmapData[0].location}</strong> has the highest issue density and needs attention.
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationHeatmap;