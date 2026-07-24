import { useState, useEffect } from 'react';
import { BatteryData } from '@/types/sensors';

export function useBattery() {
  const [batteryData, setBatteryData] = useState<BatteryData>({
    level: null,
    charging: null,
    chargingTime: null,
    dischargingTime: null,
    supported: false,
  });

  useEffect(() => {
    const nav = navigator as any;
    if (!('getBattery' in nav)) {
      setBatteryData(prev => ({ ...prev, supported: false }));
      return;
    }

    setBatteryData(prev => ({ ...prev, supported: true }));

    nav.getBattery().then((battery: any) => {
      const update = () => {
        setBatteryData({
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime === Infinity ? null : battery.chargingTime,
          dischargingTime: battery.dischargingTime === Infinity ? null : battery.dischargingTime,
          supported: true,
        });
      };

      update();
      battery.addEventListener('levelchange', update);
      battery.addEventListener('chargingchange', update);
      battery.addEventListener('chargingtimechange', update);
      battery.addEventListener('dischargingtimechange', update);

      return () => {
        battery.removeEventListener('levelchange', update);
        battery.removeEventListener('chargingchange', update);
        battery.removeEventListener('chargingtimechange', update);
        battery.removeEventListener('dischargingtimechange', update);
      };
    }).catch(() => {
      setBatteryData(prev => ({ ...prev, supported: false }));
    });
  }, []);

  return batteryData;
}
