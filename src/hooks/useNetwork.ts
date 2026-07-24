import { useState, useEffect } from 'react';
import { NetworkData } from '@/types/sensors';

export function useNetwork() {
  const getNetworkData = (): NetworkData => {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return {
      type: conn?.type ?? null,
      effectiveType: conn?.effectiveType ?? null,
      downlink: conn?.downlink ?? null,
      rtt: conn?.rtt ?? null,
      saveData: conn?.saveData ?? null,
      online: navigator.onLine,
    };
  };

  const [networkData, setNetworkData] = useState<NetworkData>(getNetworkData);
  const [supported] = useState(() => !!(
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection
  ));

  useEffect(() => {
    const handleOnline = () => setNetworkData(prev => ({ ...prev, online: true, ...getNetworkData() }));
    const handleOffline = () => setNetworkData(prev => ({ ...prev, online: false }));
    const handleChange = () => setNetworkData(getNetworkData());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    conn?.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      conn?.removeEventListener('change', handleChange);
    };
  }, []);

  return { networkData, supported };
}
