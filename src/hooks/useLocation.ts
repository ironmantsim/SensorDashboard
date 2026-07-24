import { useState, useEffect, useCallback } from 'react';
import { LocationData } from '@/types/sensors';

export function useLocation() {
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    speed: null,
    heading: null,
    error: null,
    loading: false,
  });
  const [supported, setSupported] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    setSupported('geolocation' in navigator);
  }, []);

  const requestLocation = useCallback(() => {
    if (!supported) return;

    setLocationData(prev => ({ ...prev, loading: true, error: null }));

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationData({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ? parseFloat(pos.coords.accuracy.toFixed(1)) : null,
          altitude: pos.coords.altitude ? parseFloat(pos.coords.altitude.toFixed(1)) : null,
          altitudeAccuracy: pos.coords.altitudeAccuracy ? parseFloat(pos.coords.altitudeAccuracy.toFixed(1)) : null,
          speed: pos.coords.speed ? parseFloat(pos.coords.speed.toFixed(2)) : null,
          heading: pos.coords.heading ? parseFloat(pos.coords.heading.toFixed(1)) : null,
          error: null,
          loading: false,
        });
      },
      (err) => {
        setLocationData(prev => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    setWatchId(id);
  }, [supported]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    locationData,
    supported,
    isWatching: watchId !== null,
    requestLocation,
    stopWatching,
  };
}
