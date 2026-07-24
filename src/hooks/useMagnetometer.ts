import { useState, useEffect, useCallback } from 'react';

export interface MagnetometerData {
  x: number | null;
  y: number | null;
  z: number | null;
  heading: number | null;   // compass heading in degrees 0-360
  direction: string | null; // N, NE, E, etc.
  supported: boolean;
  hasPermission: boolean | null;
  error: string | null;
  source: 'Magnetometer' | 'DeviceOrientation' | null;
}

function headingToDirection(h: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(h / 45) % 8];
}

export function useMagnetometer() {
  const hasMagnetometer = 'Magnetometer' in window;
  const hasDeviceOrientation = 'DeviceOrientationEvent' in window;

  const [data, setData] = useState<MagnetometerData>({
    x: null, y: null, z: null,
    heading: null, direction: null,
    supported: hasMagnetometer || hasDeviceOrientation,
    hasPermission: null,
    error: null,
    source: null,
  });

  const sensorRef = { current: null as any };

  const startMagnetometerAPI = useCallback(() => {
    try {
      const sensor = new (window as any).Magnetometer({ frequency: 10 });
      sensorRef.current = sensor;
      sensor.addEventListener('reading', () => {
        const x: number = parseFloat(sensor.x.toFixed(3));
        const y: number = parseFloat(sensor.y.toFixed(3));
        const z: number = parseFloat(sensor.z.toFixed(3));
        // Calculate heading from x/y
        let heading = Math.atan2(y, x) * (180 / Math.PI);
        if (heading < 0) heading += 360;
        heading = parseFloat(heading.toFixed(1));
        setData(prev => ({
          ...prev,
          x, y, z, heading,
          direction: headingToDirection(heading),
          hasPermission: true,
          error: null,
          source: 'Magnetometer',
        }));
      });
      sensor.addEventListener('error', (e: any) => {
        setData(prev => ({
          ...prev,
          error: e.error?.message ?? 'Sensor error',
          hasPermission: e.error?.name === 'NotAllowedError' ? false : prev.hasPermission,
        }));
      });
      sensor.start();
      setData(prev => ({ ...prev, hasPermission: true, source: 'Magnetometer' }));
    } catch (e: any) {
      setData(prev => ({
        ...prev,
        error: e.message,
        hasPermission: e.name === 'NotAllowedError' ? false : null,
      }));
      // Fall back to DeviceOrientation
      startDeviceOrientation();
    }
  }, []);

  const startDeviceOrientation = useCallback(() => {
    const handler = (event: DeviceOrientationEvent) => {
      const webkitHeading = (event as any).webkitCompassHeading;
      const raw = webkitHeading ?? event.alpha;
      if (raw === null) return;
      const heading = parseFloat(((raw + 360) % 360).toFixed(1));
      setData(prev => ({
        ...prev,
        heading,
        direction: headingToDirection(heading),
        hasPermission: true,
        error: null,
        source: 'DeviceOrientation',
      }));
    };
    window.addEventListener('deviceorientation', handler);
    setData(prev => ({ ...prev, hasPermission: true, source: 'DeviceOrientation' }));
    return () => window.removeEventListener('deviceorientation', handler);
  }, []);

  const requestPermission = useCallback(async () => {
    if (hasMagnetometer) {
      try {
        if ('permissions' in navigator) {
          const perm = await navigator.permissions.query({ name: 'magnetometer' as PermissionName });
          if (perm.state === 'denied') {
            setData(prev => ({ ...prev, hasPermission: false, error: 'Permission denied' }));
            return;
          }
        }
        startMagnetometerAPI();
      } catch {
        startMagnetometerAPI();
      }
    } else if (hasDeviceOrientation) {
      // iOS 13+ requires user gesture
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const response = await (DeviceOrientationEvent as any).requestPermission();
          if (response === 'granted') {
            startDeviceOrientation();
          } else {
            setData(prev => ({ ...prev, hasPermission: false, error: 'Permission denied' }));
          }
        } catch (e: any) {
          setData(prev => ({ ...prev, hasPermission: false, error: e.message }));
        }
      } else {
        startDeviceOrientation();
      }
    } else {
      setData(prev => ({ ...prev, supported: false, error: 'No compass/magnetometer API available' }));
    }
  }, [hasMagnetometer, hasDeviceOrientation, startMagnetometerAPI, startDeviceOrientation]);

  useEffect(() => {
    // Auto-start for non-iOS
    if (hasMagnetometer) {
      startMagnetometerAPI();
      return () => {
        if (sensorRef.current) {
          try { sensorRef.current.stop(); } catch {}
        }
      };
    } else if (hasDeviceOrientation) {
      if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
        return startDeviceOrientation();
      }
    }
  }, []);

  return { ...data, requestPermission };
}
