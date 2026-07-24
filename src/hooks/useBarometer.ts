import { useState, useEffect, useCallback } from 'react';

export interface BarometerData {
  pressure: number | null;
  supported: boolean;
  hasPermission: boolean | null;
  error: string | null;
}

export function useBarometer() {
  const [data, setData] = useState<BarometerData>({
    pressure: null,
    supported: 'Barometer' in window,
    hasPermission: null,
    error: null,
  });

  const sensorRef = { current: null as any };

  const startSensor = useCallback(() => {
    if (!('Barometer' in window)) {
      setData(prev => ({ ...prev, supported: false, error: 'Barometer API not available' }));
      return;
    }
    try {
      const sensor = new (window as any).Barometer({ frequency: 1 });
      sensorRef.current = sensor;
      sensor.addEventListener('reading', () => {
        setData(prev => ({
          ...prev,
          pressure: parseFloat(sensor.pressure.toFixed(2)),
          hasPermission: true,
          error: null,
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
      setData(prev => ({ ...prev, supported: true, hasPermission: true }));
    } catch (e: any) {
      setData(prev => ({
        ...prev,
        error: e.message,
        hasPermission: e.name === 'NotAllowedError' ? false : null,
      }));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Barometer' in window)) {
      setData(prev => ({ ...prev, supported: false }));
      return;
    }
    try {
      // Barometer permission is queried under 'accelerometer' in Chrome
      if ('permissions' in navigator) {
        const perm = await navigator.permissions.query({ name: 'accelerometer' as PermissionName });
        if (perm.state === 'denied') {
          setData(prev => ({ ...prev, hasPermission: false, error: 'Permission denied' }));
          return;
        }
      }
      startSensor();
    } catch (e: any) {
      setData(prev => ({ ...prev, error: e.message, hasPermission: false }));
    }
  }, [startSensor]);

  useEffect(() => {
    // Auto-start — will be blocked by browser if no permission
    startSensor();
    return () => {
      if (sensorRef.current) {
        try { sensorRef.current.stop(); } catch {}
      }
    };
  }, []);

  return { ...data, requestPermission };
}
