import { useBattery } from '@/hooks/useBattery';
import { useNetwork } from '@/hooks/useNetwork';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';
import { useMotionSensors } from '@/hooks/useMotionSensors';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Battery, Wifi, WifiOff, Monitor, Activity, Cpu, MapPin, Mic, Camera, CheckCircle2, XCircle, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NavSection } from '@/types/sensors';
import heroImg from '@/assets/hero-bg.jpg';
import { useState } from 'react';

interface QuickStatProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  onClick?: () => void;
}

function QuickStat({ label, value, sub, icon: Icon, iconColor, bgColor, onClick }: QuickStatProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'glass-card p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg w-full',
        onClick && 'cursor-pointer'
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', bgColor)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <div className="text-xl font-bold font-mono text-foreground leading-none">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </button>
  );
}

interface SensorQuickStatus {
  name: string;
  supported: boolean;
}

const QUICK_SENSORS: SensorQuickStatus[] = [
  { name: 'Geolocation', supported: 'geolocation' in navigator },
  { name: 'DeviceMotion', supported: 'DeviceMotionEvent' in window },
  { name: 'Camera', supported: 'mediaDevices' in navigator },
  { name: 'Microphone', supported: 'mediaDevices' in navigator },
  { name: 'Battery API', supported: 'getBattery' in navigator },
  { name: 'Network Info', supported: 'connection' in navigator || 'mozConnection' in navigator },
  { name: 'AmbientLight', supported: 'AmbientLightSensor' in window },
  { name: 'Barometer', supported: 'Barometer' in window },
];

interface DashboardHomeProps {
  onNavigate: (section: NavSection) => void;
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const battery = useBattery();
  const { networkData } = useNetwork();
  const device = useDeviceInfo();
  const { motionData } = useMotionSensors();
  const pwa = usePWAInstall();
  const [iosToast, setIosToast] = useState(false);
  const [genericToast, setGenericToast] = useState(false);

  const supportedCount = QUICK_SENSORS.filter(s => s.supported).length;

  const handleInstall = async () => {
    if (pwa.isIOS) {
      setIosToast(true);
      setTimeout(() => setIosToast(false), 6000);
      return;
    }
    // Always try the native prompt first (uses ref internally so no race condition)
    const result = await pwa.install();
    if (result === 'unavailable') {
      // Native prompt not available yet — show browser instructions
      setGenericToast(true);
      setTimeout(() => setGenericToast(false), 6000);
    }
  };

  const batteryColor = !battery.supported ? 'text-muted-foreground'
    : battery.charging ? 'text-green-500'
    : (battery.level ?? 100) <= 15 ? 'text-red-500'
    : (battery.level ?? 100) <= 50 ? 'text-yellow-500'
    : 'text-green-500';

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-52 sm:h-64">
        <img src={heroImg} alt="Sensor Dashboard" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-xs font-medium uppercase tracking-wider">Real-time Monitoring</span>
          </div>
          <h2 className="text-white text-2xl sm:text-3xl font-bold leading-tight mb-4">Phone Sensor<br />Dashboard</h2>

          {/* PWA Install button */}
          {pwa.isInstalled ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit bg-green-500/20 border border-green-500/30">
              <Smartphone className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-300 text-xs font-medium">Installed as App</span>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleInstall}
              className="w-fit bg-primary/80 hover:bg-primary border-0 text-white shadow-lg shadow-primary/30 gap-2 h-9 font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              {pwa.isInstallable ? 'Install App' : 'Add to Home Screen'}
            </Button>
          )}
        </div>

        {/* iOS install tooltip */}
        {iosToast && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <p className="text-white text-xs text-center">
              Tap <span className="font-bold">Share ↑</span> then <span className="font-bold">Add to Home Screen</span> to install
            </p>
          </div>
        )}
        {/* Generic browser tooltip */}
        {genericToast && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/90 backdrop-blur-md rounded-xl p-3 border border-white/20 space-y-1">
            <p className="text-white text-xs font-semibold text-center">How to install:</p>
            <p className="text-white/80 text-xs text-center">
              <span className="font-bold text-cyan-300">Android Chrome:</span> tap <span className="font-bold">⋮</span> → <span className="font-bold">Add to Home Screen</span>
            </p>
            <p className="text-white/80 text-xs text-center">
              <span className="font-bold text-cyan-300">Desktop Chrome/Edge:</span> click <span className="font-bold">⊕</span> in address bar
            </p>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickStat
            label="Battery"
            value={battery.supported && battery.level !== null ? `${battery.level}%` : 'N/A'}
            sub={battery.charging ? 'Charging ⚡' : undefined}
            icon={Battery}
            iconColor={batteryColor}
            bgColor="bg-yellow-500/10"
            onClick={() => onNavigate('battery')}
          />
          <QuickStat
            label="Network"
            value={networkData.online ? 'Online' : 'Offline'}
            sub={networkData.effectiveType?.toUpperCase() ?? networkData.type ?? undefined}
            icon={networkData.online ? Wifi : WifiOff}
            iconColor={networkData.online ? 'text-cyan-500' : 'text-red-500'}
            bgColor="bg-cyan-500/10"
            onClick={() => onNavigate('network')}
          />
          <QuickStat
            label="Device"
            value={device.os}
            sub={`${device.browser} ${device.browserVersion.split('.')[0]}`}
            icon={Monitor}
            iconColor="text-indigo-500"
            bgColor="bg-indigo-500/10"
            onClick={() => onNavigate('device')}
          />
          <QuickStat
            label="Accelerometer"
            value={motionData.accelerometer.x !== null ? `${motionData.accelerometer.x}` : '—'}
            sub="X-axis m/s²"
            icon={Activity}
            iconColor="text-violet-500"
            bgColor="bg-violet-500/10"
            onClick={() => onNavigate('motion')}
          />
        </div>
      </div>

      {/* Sensor API support */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">API Support</h3>
        <div className="glass-card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_SENSORS.map(s => (
              <div key={s.name} className={cn(
                'flex items-center gap-1.5 p-2 rounded-lg text-xs',
                s.supported ? 'bg-green-500/8 text-green-700 dark:text-green-300' : 'bg-red-500/8 text-red-600 dark:text-red-400'
              )}>
                {s.supported
                  ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                }
                <span className="truncate">{s.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-green-500"
              style={{ width: `${(supportedCount / QUICK_SENSORS.length) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {supportedCount} of {QUICK_SENSORS.length} browser APIs available on this device
          </p>
        </div>
      </div>

      {/* Navigation cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Explore Sensors</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { section: 'motion' as NavSection, label: 'Motion', desc: 'Accel & Gyro', icon: Cpu, color: 'text-violet-500', bg: 'bg-violet-500/10' },
            { section: 'location' as NavSection, label: 'Location', desc: 'GPS & Maps', icon: MapPin, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { section: 'audio' as NavSection, label: 'Audio', desc: 'Microphone', icon: Mic, color: 'text-pink-500', bg: 'bg-pink-500/10' },
            { section: 'camera' as NavSection, label: 'Camera', desc: 'Live preview', icon: Camera, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { section: 'status' as NavSection, label: 'API Status', desc: 'All sensors', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
            { section: 'visualization' as NavSection, label: 'Charts', desc: 'Export data', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { section: 'recording' as NavSection, label: 'Recording', desc: 'Record & export', icon: Activity, color: 'text-red-500', bg: 'bg-red-500/10' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.section}
                onClick={() => onNavigate(item.section)}
                className="glass-card p-4 text-left hover:border-primary/40 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', item.bg)}>
                  <Icon className={cn('h-4 w-4', item.color)} />
                </div>
                <div className="text-sm font-semibold text-foreground">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
