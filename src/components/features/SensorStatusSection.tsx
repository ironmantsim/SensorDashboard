import { SensorCard } from '@/components/features/SensorCard';
import { CheckCircle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SensorEntry {
  name: string;
  category: string;
  check: () => boolean | 'partial';
  note?: string;
}

const SENSORS: SensorEntry[] = [
  { name: 'DeviceMotionEvent', category: 'Motion', check: () => 'DeviceMotionEvent' in window },
  { name: 'DeviceOrientationEvent', category: 'Motion', check: () => 'DeviceOrientationEvent' in window },
  { name: 'Accelerometer (Sensor API)', category: 'Motion', check: () => 'Accelerometer' in window },
  { name: 'Gyroscope (Sensor API)', category: 'Motion', check: () => 'Gyroscope' in window },
  { name: 'AbsoluteOrientationSensor', category: 'Motion', check: () => 'AbsoluteOrientationSensor' in window },
  { name: 'Geolocation API', category: 'Location', check: () => 'geolocation' in navigator },
  { name: 'Magnetometer', category: 'Location', check: () => 'Magnetometer' in window },
  { name: 'AmbientLightSensor', category: 'Environment', check: () => 'AmbientLightSensor' in window },
  { name: 'Barometer', category: 'Environment', check: () => 'Barometer' in window },
  { name: 'Battery API', category: 'System', check: () => 'getBattery' in navigator },
  { name: 'Microphone (MediaDevices)', category: 'Audio', check: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices },
  { name: 'Camera (MediaDevices)', category: 'Camera', check: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices },
  { name: 'Network Information API', category: 'Network', check: () => 'connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator },
  { name: 'Online/Offline Events', category: 'Network', check: () => 'onLine' in navigator },
  { name: 'Permissions API', category: 'System', check: () => 'permissions' in navigator },
  { name: 'Vibration API', category: 'System', check: () => 'vibrate' in navigator },
  { name: 'Web Bluetooth', category: 'Connectivity', check: () => 'bluetooth' in navigator },
  { name: 'Web NFC', category: 'Connectivity', check: () => 'nfc' in navigator },
  { name: 'WebGL', category: 'Graphics', check: () => {
    try { return !!(document.createElement('canvas').getContext('webgl')); } catch { return false; }
  }},
  { name: 'Service Workers', category: 'System', check: () => 'serviceWorker' in navigator },
  { name: 'Web Share API', category: 'System', check: () => 'share' in navigator },
  { name: 'Clipboard API', category: 'System', check: () => 'clipboard' in navigator },
  { name: 'Wake Lock API', category: 'System', check: () => 'wakeLock' in navigator },
  { name: 'Screen Orientation API', category: 'Display', check: () => 'orientation' in screen },
];

const CATEGORIES = [...new Set(SENSORS.map(s => s.category))];

function StatusIcon({ supported }: { supported: boolean | 'partial' }) {
  if (supported === true) return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
  if (supported === 'partial') return <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
}

export function SensorStatusSection() {
  const results = SENSORS.map(s => ({ ...s, supported: s.check() }));
  const supported = results.filter(r => r.supported === true).length;
  const total = results.length;

  return (
    <div className="space-y-4">
      <h2 className="section-title flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-500" /> Sensor Status
      </h2>

      {/* Summary bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium">Browser API Support</p>
            <p className="text-xs text-muted-foreground">{supported} of {total} APIs available</p>
          </div>
          <div className="text-2xl font-bold font-mono text-primary">
            {Math.round((supported / total) * 100)}%
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-green-500 transition-all duration-700"
            style={{ width: `${(supported / total) * 100}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {supported} Supported
          </div>
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <XCircle className="h-3.5 w-3.5" />
            {total - supported} Unsupported
          </div>
        </div>
      </div>

      {/* By category */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => {
          const catSensors = results.filter(r => r.category === cat);
          return (
            <SensorCard
              key={cat}
              title={cat}
              icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            >
              <div className="space-y-1.5">
                {catSensors.map(sensor => (
                  <div key={sensor.name} className={cn(
                    'flex items-center gap-2 p-2 rounded-lg',
                    sensor.supported ? 'bg-green-500/5' : 'bg-red-500/5'
                  )}>
                    <StatusIcon supported={sensor.supported} />
                    <span className="text-xs text-foreground flex-1">{sensor.name}</span>
                  </div>
                ))}
              </div>
            </SensorCard>
          );
        })}
      </div>
    </div>
  );
}
