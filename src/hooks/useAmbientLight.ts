import { useState, useEffect, useCallback } from 'react';

export interface AmbientLightData {
  value: number | null;
  supported: boolean;
  hasPermission: boolean | null;
  error: string | null;
}

export function useAmbientLight() {
  const [data, setData] = useState<AmbientLightData>({
    value: null,
    supported: 'AmbientLightSensor' in window || 'ondevicelight' in window,
    hasPermission: null,
    error: null,
  });

  const sensorRef = { current: null as any };

  const startGenericSensor = useCallback(() => {
    try {
      const sensor = new (window as any).AmbientLightSensor();
      sensorRef.current = sensor;
      sensor.addEventListener('reading', () => {
        setData(prev => ({
          ...prev,
          value: parseFloat(sensor.illuminance.toFixed(1)),
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
      setData(prev => ({ ...prev, hasPermission: true }));
    } catch (e: any) {
      setData(prev => ({
        ...prev,
        error: e.message,
        hasPermission: e.name === 'NotAllowedError' ? false : null,
      }));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('AmbientLightSensor' in window) {
      try {
        if ('permissions' in navigator) {
          const perm = await navigator.permissions.query({ name: 'ambient-light-sensor' as PermissionName });
          if (perm.state === 'denied') {
            setData(prev => ({ ...prev, hasPermission: false, error: 'Permission denied' }));
            return;
          }
        }
        startGenericSensor();
      } catch (e: any) {
        // permissions.query may throw for unknown names — try anyway
        startGenericSensor();
      }
    } else if ('ondevicelight' in window) {
      setData(prev => ({ ...prev, supported: true, hasPermission: true }));
      const handler = (e: any) => setData(prev => ({ ...prev, value: e.value, hasPermission: true }));
      window.addEventListener('devicelight', handler);
    } else {
      setData(prev => ({ ...prev, supported: false, error: 'AmbientLightSensor not available' }));
    }
  }, [startGenericSensor]);

  useEffect(() => {
    if ('AmbientLightSensor' in window) {
      startGenericSensor();
      return () => {
        if (sensorRef.current) {
          try { sensorRef.current.stop(); } catch {}
        }
      };
    } else if ('ondevicelight' in window) {
      setData(prev => ({ ...prev, supported: true, hasPermission: true }));
      const handler = (e: any) => setData(prev => ({ ...prev, value: e.value }));
      window.addEventListener('devicelight', handler);
      return () => window.removeEventListener('devicelight', handler);
    }
  }, []);

  return { ...data, requestPermission };
}
