import { useState, useCallback, useRef } from 'react';

const HOST_COORDS = { lat: 28.5947, lng: 77.0191 }; // GGSIPU, Dwarka, Delhi
const TIMEOUT_MS = 3000;

/**
 * Calculates distance using the Haversine formula.
 */
function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useProximity() {
  const [status, setStatus] = useState('IDLE'); // IDLE, REQUESTING, SUCCESS, TIMEOUT, DENIED
  const [data, setData] = useState({
    isNearby: false,
    distance: null,
    visitorCoords: null,
    error: null,
  });

  const timerRef = useRef(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('DENIED');
      setData(prev => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    setStatus('REQUESTING');

    // Start 3s timeout timer
    timerRef.current = setTimeout(() => {
      setStatus('TIMEOUT');
      console.warn('[NeuralLink] Connection timeout: Signal interference detected.');
    }, TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timerRef.current);
        const { latitude, longitude } = position.coords;
        const dist = calculateHaversine(latitude, longitude, HOST_COORDS.lat, HOST_COORDS.lng);
        
        setData({
          isNearby: dist < 5.0,
          distance: dist,
          visitorCoords: { lat: latitude, lng: longitude },
          error: null,
        });
        setStatus('SUCCESS');
        console.log(`[NeuralLink] Link Established. Distance: ${dist.toFixed(2)}km`);
      },
      (err) => {
        clearTimeout(timerRef.current);
        setStatus('DENIED');
        setData(prev => ({ ...prev, error: err.message }));
        console.warn(`[NeuralLink] Access Denied: ${err.message}`);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 5000, // Browser-level timeout
        maximumAge: 0 
      }
    );
  }, []);

  return { status, ...data, requestLocation };
}
