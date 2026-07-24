import { useState, useEffect } from 'react';
import { SensorCard } from '@/components/features/SensorCard';
import { ShieldCheck, MapPin, Mic, Camera, Cpu, Check, X, Clock, RefreshCw, Compass, Sun, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown' | 'checking';

interface PermItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  permName?: PermissionName;
  requestFn?: () => Promise<boolean>;
}

const PERMISSIONS: PermItem[] = [
  {
    id: 'geolocation',
    label: 'Location (GPS)',
    description: 'Access your device geographic position',
    icon: MapPin,
    color: 'text-emerald-500',
    permName: 'geolocation' as PermissionName,
    requestFn: async () => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false)
        );
      });
    },
  },
  {
    id: 'microphone',
    label: 'Microphone',
    description: 'Access your device microphone for audio',
    icon: Mic,
    color: 'text-pink-500',
    permName: 'microphone' as PermissionName,
    requestFn: async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    },
  },
  {
    id: 'camera',
    label: 'Camera',
    description: 'Access your device camera for video capture',
    icon: Camera,
    color: 'text-blue-500',
    permName: 'camera' as PermissionName,
    requestFn: async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    },
  },
  {
    id: 'motion',
    label: 'Motion Sensors',
    description: 'Access accelerometer, gyroscope, orientation',
    icon: Cpu,
    color: 'text-violet-500',
    requestFn: async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const result = await (DeviceMotionEvent as any).requestPermission();
        return result === 'granted';
      }
      return 'DeviceMotionEvent' in window;
    },
  },
  {
    id: 'magnetometer',
    label: 'Compass / Magnetometer',
    description: 'Access magnetic field sensor for compass heading',
    icon: Compass,
    color: 'text-sky-500',
    permName: 'magnetometer' as PermissionName,
    requestFn: async () => {
      if ('Magnetometer' in window) {
        if ('permissions' in navigator) {
          const p = await navigator.permissions.query({ name: 'magnetometer' as PermissionName });
          if (p.state === 'denied') return false;
        }
        return new Promise((resolve) => {
          try {
            const s = new (window as any).Magnetometer({ frequency: 1 });
            s.addEventListener('reading', () => { s.stop(); resolve(true); });
            s.addEventListener('error', () => resolve(false));
            s.start();
          } catch { resolve(false); }
        });
      }
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const r = await (DeviceOrientationEvent as any).requestPermission();
        return r === 'granted';
      }
      return 'DeviceOrientationEvent' in window;
    },
  },
  {
    id: 'ambient-light',
    label: 'Ambient Light',
    description: 'Access ambient light sensor for illuminance readings',
    icon: Sun,
    color: 'text-yellow-500',
    permName: 'ambient-light-sensor' as PermissionName,
    requestFn: async () => {
      if (!('AmbientLightSensor' in window)) return false;
      return new Promise((resolve) => {
        try {
          const s = new (window as any).AmbientLightSensor();
          s.addEventListener('reading', () => { s.stop(); resolve(true); });
          s.addEventListener('error', () => resolve(false));
          s.start();
        } catch { resolve(false); }
      });
    },
  },
  {
    id: 'barometer',
    label: 'Barometer',
    description: 'Access barometric pressure sensor for weather data',
    icon: Wind,
    color: 'text-blue-500',
    permName: 'accelerometer' as PermissionName,
    requestFn: async () => {
      if (!('Barometer' in window)) return false;
      if ('permissions' in navigator) {
        const p = await navigator.permissions.query({ name: 'accelerometer' as PermissionName });
        if (p.state === 'denied') return false;
      }
      return new Promise((resolve) => {
        try {
          const s = new (window as any).Barometer({ frequency: 1 });
          s.addEventListener('reading', () => { s.stop(); resolve(true); });
          s.addEventListener('error', () => resolve(false));
          s.start();
        } catch { resolve(false); }
      });
    },
  },
];

function StatusBadge({ state }: { state: PermissionState }) {
  const config = {
    granted: { label: 'Granted', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', icon: Check },
    denied: { label: 'Denied', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: X },
    prompt: { label: 'Not Asked', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', icon: Clock },
    unknown: { label: 'Unknown', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
    checking: { label: 'Checking...', color: 'bg-muted text-muted-foreground border-border', icon: RefreshCw },
  }[state];

  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium', config.color)}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}

export function PermissionsSection() {
  const [states, setStates] = useState<Record<string, PermissionState>>(
    Object.fromEntries(PERMISSIONS.map(p => [p.id, 'checking']))
  );

  useEffect(() => {
    const checkAll = async () => {
      for (const perm of PERMISSIONS) {
        if (perm.permName && 'permissions' in navigator) {
          try {
            const status = await navigator.permissions.query({ name: perm.permName });
            setStates(prev => ({ ...prev, [perm.id]: status.state as PermissionState }));
            status.onchange = () => {
              setStates(prev => ({ ...prev, [perm.id]: status.state as PermissionState }));
            };
          } catch {
            setStates(prev => ({ ...prev, [perm.id]: 'unknown' }));
          }
        } else {
          setStates(prev => ({ ...prev, [perm.id]: 'unknown' }));
        }
      }
    };
    checkAll();
  }, []);

  const requestPerm = async (perm: PermItem) => {
    if (!perm.requestFn) return;
    setStates(prev => ({ ...prev, [perm.id]: 'checking' }));
    try {
      const granted = await perm.requestFn();
      setStates(prev => ({ ...prev, [perm.id]: granted ? 'granted' : 'denied' }));
    } catch {
      setStates(prev => ({ ...prev, [perm.id]: 'denied' }));
    }
  };

  const requestAll = async () => {
    for (const perm of PERMISSIONS) {
      await requestPerm(perm);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-500" /> Permissions Center
        </h2>
        <Button size="sm" onClick={requestAll} className="text-xs h-7">
          Request All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PERMISSIONS.map((perm) => {
          const Icon = perm.icon;
          const state = states[perm.id];
          return (
            <SensorCard
              key={perm.id}
              title={perm.label}
              icon={<Icon className={cn('h-4 w-4', perm.color)} />}
              badge={<StatusBadge state={state} />}
            >
              <p className="text-xs text-muted-foreground mb-3">{perm.description}</p>
              <Button
                size="sm"
                variant={state === 'granted' ? 'outline' : 'default'}
                className="w-full text-xs h-8"
                onClick={() => requestPerm(perm)}
                disabled={state === 'checking'}
              >
                {state === 'checking' ? (
                  <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Checking...</>
                ) : state === 'granted' ? (
                  <><Check className="h-3.5 w-3.5 mr-1.5 text-green-500" /> Permission Granted</>
                ) : (
                  <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Request Permission</>
                )}
              </Button>
            </SensorCard>
          );
        })}
      </div>
    </div>
  );
}
