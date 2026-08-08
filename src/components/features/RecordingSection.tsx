import { useEffect, useState } from 'react';
import { useRecording } from '@/hooks/useRecording';
import { useMotionSensors } from '@/hooks/useMotionSensors';
import { useLocation } from '@/hooks/useLocation';
import { useBattery } from '@/hooks/useBattery';
import { useNetwork } from '@/hooks/useNetwork';
import { useAmbientLight } from '@/hooks/useAmbientLight';
import { useBarometer } from '@/hooks/useBarometer';
import { useMagnetometer } from '@/hooks/useMagnetometer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { SensorCard } from '@/components/features/SensorCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Circle, Square, Download, Trash2, FileJson, FileText,
  Activity, Clock, Database, AlertCircle,
  SlidersHorizontal, Share2, Upload, Loader2, X as XIcon,
  Zap, RotateCcw, Compass, MapPin, Battery, BatteryCharging,
  Gauge, Sun, Wifi, Signal, Lock,
} from 'lucide-react';

// ── Sensor ID type ─────────────────────────────────────────────────────────
type SensorId =
  | 'accel'
  | 'gyro'
  | 'orientation'
  | 'gps'
  | 'magnetometer'
  | 'battery_level'
  | 'battery_charging'
  | 'barometer'
  | 'ambient_light'
  | 'network_type'
  | 'network_speed';

// ── Sensor permission states ───────────────────────────────────────────────
type PermState = 'granted' | 'denied' | 'unknown' | 'unsupported';

// ── Sensor definition ──────────────────────────────────────────────────────
interface SensorDef {
  id: SensorId;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  activeBorder: string;
  trackBg: string;
  group: string;
  /** fields this sensor records */
  fields: string[];
}

const SENSORS: SensorDef[] = [
  {
    id: 'accel',
    label: 'Accelerometer',
    desc: 'accel_x · accel_y · accel_z',
    icon: Zap,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    activeBorder: 'border-violet-500/40',
    trackBg: 'bg-violet-500',
    group: 'Motion',
    fields: ['accel_x', 'accel_y', 'accel_z'],
  },
  {
    id: 'gyro',
    label: 'Gyroscope',
    desc: 'gyro_x · gyro_y · gyro_z',
    icon: RotateCcw,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    activeBorder: 'border-purple-500/40',
    trackBg: 'bg-purple-500',
    group: 'Motion',
    fields: ['gyro_x', 'gyro_y', 'gyro_z'],
  },
  {
    id: 'orientation',
    label: 'Orientation',
    desc: 'alpha · beta · gamma',
    icon: Activity,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    activeBorder: 'border-fuchsia-500/40',
    trackBg: 'bg-fuchsia-500',
    group: 'Motion',
    fields: ['orientation_alpha', 'orientation_beta', 'orientation_gamma'],
  },
  {
    id: 'gps',
    label: 'GPS Location',
    desc: 'lat · lng · accuracy · speed',
    icon: MapPin,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    activeBorder: 'border-emerald-500/40',
    trackBg: 'bg-emerald-500',
    group: 'Location',
    fields: ['gps_lat', 'gps_lng', 'gps_accuracy', 'gps_speed'],
  },
  {
    id: 'magnetometer',
    label: 'Magnetometer',
    desc: 'compass_heading (0–360°)',
    icon: Compass,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    activeBorder: 'border-blue-500/40',
    trackBg: 'bg-blue-500',
    group: 'Location',
    fields: ['compass_heading'],
  },
  {
    id: 'battery_level',
    label: 'Battery Level',
    desc: 'battery_level (%)',
    icon: Battery,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    activeBorder: 'border-yellow-500/40',
    trackBg: 'bg-yellow-500',
    group: 'System',
    fields: ['battery_level'],
  },
  {
    id: 'battery_charging',
    label: 'Charging State',
    desc: 'battery_charging (bool)',
    icon: BatteryCharging,
    color: 'text-lime-400',
    bg: 'bg-lime-500/10',
    activeBorder: 'border-lime-500/40',
    trackBg: 'bg-lime-500',
    group: 'System',
    fields: ['battery_charging'],
  },
  {
    id: 'barometer',
    label: 'Barometer',
    desc: 'pressure_hpa (hPa)',
    icon: Gauge,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    activeBorder: 'border-orange-500/40',
    trackBg: 'bg-orange-500',
    group: 'Environment',
    fields: ['pressure_hpa'],
  },
  {
    id: 'ambient_light',
    label: 'Ambient Light',
    desc: 'light_lux (lux)',
    icon: Sun,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    activeBorder: 'border-amber-500/40',
    trackBg: 'bg-amber-500',
    group: 'Environment',
    fields: ['light_lux'],
  },
  {
    id: 'network_type',
    label: 'Network Type',
    desc: 'network_type (wifi/4g/…)',
    icon: Wifi,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    activeBorder: 'border-cyan-500/40',
    trackBg: 'bg-cyan-500',
    group: 'Network',
    fields: ['network_type'],
  },
  {
    id: 'network_speed',
    label: 'Network Speed',
    desc: 'network_effective (2g/3g/4g)',
    icon: Signal,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    activeBorder: 'border-sky-500/40',
    trackBg: 'bg-sky-500',
    group: 'Network',
    fields: ['network_effective'],
  },
];

const GROUPS = ['Motion', 'Location', 'System', 'Environment', 'Network'];

// ── Helpers ────────────────────────────────────────────────────────────────
function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export function RecordingSection() {
  const rec = useRecording();
  const { user } = useAuth();

  // Sensor hooks
  const { motionData, hasPermission: motionPerm } = useMotionSensors();
  const { locationData } = useLocation();
  const battery = useBattery();
  const { networkData } = useNetwork();
  const light = useAmbientLight();
  const baro = useBarometer();
  const compass = useMagnetometer();

  // ── Per-sensor enabled state ──
  const [enabled, setEnabled] = useState<Record<SensorId, boolean>>({
    accel: true,
    gyro: true,
    orientation: true,
    gps: true,
    magnetometer: true,
    battery_level: true,
    battery_charging: true,
    barometer: true,
    ambient_light: true,
    network_type: true,
    network_speed: true,
  });

  const toggle = (id: SensorId) => {
    if (rec.isRecording) return;
    setEnabled(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () =>
    setEnabled(Object.fromEntries(SENSORS.map(s => [s.id, true])) as Record<SensorId, boolean>);
  const clearAll = () =>
    setEnabled(Object.fromEntries(SENSORS.map(s => [s.id, false])) as Record<SensorId, boolean>);

  // ── Derive permission state for each sensor ──
  const permState = (id: SensorId): PermState => {
    switch (id) {
      case 'accel':
      case 'gyro':
      case 'orientation':
        if (motionPerm === false) return 'denied';
        if (
          motionData.accelerometer.x !== null ||
          motionData.gyroscope.x !== null ||
          motionData.orientation.alpha !== null
        ) return 'granted';
        return 'unknown';
      case 'gps': {
        if (!locationData.error) {
          if (locationData.latitude !== null) return 'granted';
          return 'unknown';
        }
        const msg = locationData.error.toLowerCase();
        if (msg.includes('denied') || msg.includes('permission')) return 'denied';
        return 'unknown';
      }
      case 'magnetometer':
        if (compass.hasPermission === false) return 'denied';
        if (!compass.supported) return 'unsupported';
        if (compass.heading !== null) return 'granted';
        return 'unknown';
      case 'battery_level':
      case 'battery_charging':
        if (!battery.supported) return 'unsupported';
        return battery.level !== null ? 'granted' : 'unknown';
      case 'barometer':
        if (!baro.supported) return 'unsupported';
        if (baro.hasPermission === false) return 'denied';
        if (baro.pressure !== null) return 'granted';
        return 'unknown';
      case 'ambient_light':
        if (!light.supported) return 'unsupported';
        if (light.hasPermission === false) return 'denied';
        if (light.value !== null) return 'granted';
        return 'unknown';
      case 'network_type':
      case 'network_speed':
        return networkData.type !== null ? 'granted' : 'unknown';
      default:
        return 'unknown';
    }
  };

  const isBlocked = (id: SensorId) => {
    const p = permState(id);
    return p === 'denied' || p === 'unsupported';
  };

  // ── Register data getter ──
  useEffect(() => {
    rec.registerDataGetter(() => ({
      accel_x: enabled.accel ? motionData.accelerometer.x : null,
      accel_y: enabled.accel ? motionData.accelerometer.y : null,
      accel_z: enabled.accel ? motionData.accelerometer.z : null,
      gyro_x: enabled.gyro ? motionData.gyroscope.x : null,
      gyro_y: enabled.gyro ? motionData.gyroscope.y : null,
      gyro_z: enabled.gyro ? motionData.gyroscope.z : null,
      orientation_alpha: enabled.orientation ? motionData.orientation.alpha : null,
      orientation_beta: enabled.orientation ? motionData.orientation.beta : null,
      orientation_gamma: enabled.orientation ? motionData.orientation.gamma : null,
      gps_lat: enabled.gps ? locationData.latitude : null,
      gps_lng: enabled.gps ? locationData.longitude : null,
      gps_accuracy: enabled.gps ? locationData.accuracy : null,
      gps_speed: enabled.gps ? locationData.speed : null,
      compass_heading: enabled.magnetometer ? compass.heading : null,
      battery_level: enabled.battery_level ? battery.level : null,
      battery_charging: enabled.battery_charging ? battery.charging : null,
      pressure_hpa: enabled.barometer ? baro.pressure : null,
      light_lux: enabled.ambient_light ? light.value : null,
      network_type: enabled.network_type ? networkData.type : null,
      network_effective: enabled.network_speed ? networkData.effectiveType : null,
    }));
  }, [motionData, locationData, battery, networkData, light, baro, compass, enabled]);

  // ── Share state ──
  const [shareTitle, setShareTitle] = useState('');
  const [showShareForm, setShowShareForm] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!user || !shareTitle.trim()) return;
    setSharing(true);
    const activeGroups = [...new Set(SENSORS.filter(s => enabled[s.id]).map(s => s.group))];
    const { error } = await supabase
      .from('shared_recordings')
      .insert({
        owner_id: user.id,
        title: shareTitle.trim(),
        data: rec.rows,
        sensor_groups: activeGroups,
        sample_count: rec.rows.length,
        duration_ms: rec.elapsed,
      });
    if (error) {
      toast.error('Failed to share: ' + error.message);
    } else {
      toast.success('Recording shared to your cloud profile!');
      setShowShareForm(false);
      setShareTitle('');
    }
    setSharing(false);
  };

  const selectedCount = Object.values(enabled).filter(Boolean).length;
  const hasData = rec.rows.length > 0;

  // Group sensors for grouped display
  const groupedSensors = GROUPS.map(group => ({
    group,
    sensors: SENSORS.filter(s => s.group === group),
  }));

  const permLabel = (state: PermState) => {
    if (state === 'granted') return null;
    if (state === 'denied') return 'Permission denied';
    if (state === 'unsupported') return 'Not supported';
    return null;
  };

  return (
    <div className="space-y-4">
      <h2 className="section-title flex items-center gap-2">
        <Activity className="h-5 w-5 text-rose-500" /> Sensor Recording
      </h2>

      {/* ── Sensor Selection ── */}
      <SensorCard
        title="Sensor Selection"
        icon={<SlidersHorizontal className="h-4 w-4 text-rose-400" />}
      >
        <p className="text-xs text-muted-foreground mb-3">
          {rec.isRecording
            ? 'Sensor selection is locked while recording is active.'
            : 'Toggle individual sensors. Blurred sensors require permission or are unsupported on this device.'}
        </p>

        <div className="space-y-4">
          {groupedSensors.map(({ group, sensors }) => (
            <div key={group}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-border/40" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {group}
                </span>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sensors.map(sensor => {
                  const Icon = sensor.icon;
                  const isOn = enabled[sensor.id];
                  const pState = permState(sensor.id);
                  const blocked = isBlocked(sensor.id);
                  const pMsg = permLabel(pState);

                  return (
                    <button
                      key={sensor.id}
                      onClick={() => !blocked && toggle(sensor.id)}
                      disabled={rec.isRecording}
                      className={cn(
                        'relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 select-none w-full',
                        blocked
                          ? 'opacity-40 blur-[0.5px] cursor-not-allowed bg-muted/10 border-border/30 grayscale'
                          : isOn
                            ? `${sensor.bg} ${sensor.activeBorder} cursor-pointer hover:scale-[1.01] active:scale-[0.99]`
                            : 'bg-muted/20 border-border/40 opacity-60 cursor-pointer hover:opacity-80',
                        rec.isRecording && !blocked && 'cursor-not-allowed',
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                        blocked ? 'bg-muted/60' : isOn ? sensor.bg : 'bg-muted/40'
                      )}>
                        {blocked
                          ? <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                          : <Icon className={cn('h-3.5 w-3.5', isOn ? sensor.color : 'text-muted-foreground/50')} />
                        }
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'text-xs font-semibold leading-tight',
                          blocked ? 'text-muted-foreground/60' : isOn ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {sensor.label}
                        </div>
                        {pMsg ? (
                          <div className="text-[10px] text-red-400/80 mt-0.5">{pMsg}</div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug font-mono">
                            {sensor.desc}
                          </div>
                        )}
                      </div>

                      {/* Toggle switch */}
                      {!blocked && (
                        <div className={cn(
                          'flex-shrink-0 w-8 h-4 rounded-full transition-colors duration-200',
                          isOn ? sensor.trackBg : 'bg-muted-foreground/25'
                        )}>
                          <div className={cn(
                            'w-3 h-3 rounded-full bg-white shadow mt-0.5 transition-transform duration-200',
                            isOn ? 'translate-x-4' : 'translate-x-0.5'
                          )} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer row */}
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            <span className={cn('font-medium', selectedCount > 0 ? 'text-foreground' : 'text-amber-500')}>
              {selectedCount}
            </span>
            {' '}/ {SENSORS.length} sensors selected
          </span>
          {!rec.isRecording && (
            <div className="flex gap-3 text-xs">
              <button onClick={selectAll} className="text-primary hover:underline">Select All</button>
              <span className="text-muted-foreground/30">|</span>
              <button onClick={clearAll} className="text-muted-foreground hover:text-foreground hover:underline">Clear All</button>
            </div>
          )}
        </div>
      </SensorCard>

      {/* ── Controls ── */}
      <SensorCard
        title="Recording Controls"
        icon={<Circle className={cn('h-4 w-4', rec.isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground')} />}
        live={rec.isRecording}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              'w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
              rec.isRecording ? 'border-red-500 bg-red-500/10' : 'border-border bg-muted/30'
            )}>
              {rec.isRecording
                ? <div className="w-3.5 h-3.5 rounded bg-red-500 animate-pulse" />
                : <Circle className="h-5 w-5 text-muted-foreground/40" />}
            </div>
            <div>
              <div className={cn(
                'text-2xl font-mono font-bold tabular-nums',
                rec.isRecording ? 'text-red-500' : 'text-foreground'
              )}>
                {formatElapsed(rec.elapsed)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                {rec.rows.length} samples · {selectedCount} sensor{selectedCount !== 1 ? 's' : ''} active
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            {!rec.isRecording ? (
              <Button
                onClick={rec.startRecording}
                disabled={selectedCount === 0}
                className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white gap-1.5 disabled:opacity-40"
                size="sm"
              >
                <Circle className="h-3.5 w-3.5 fill-white" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={rec.stopRecording}
                variant="outline"
                className="flex-1 sm:flex-none border-red-500/40 text-red-500 hover:bg-red-500/10 gap-1.5"
                size="sm"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </Button>
            )}
            {hasData && !rec.isRecording && (
              <Button
                onClick={rec.clearRecording}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Info bar */}
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          Sampling at 2 Hz (every 500 ms)
          {selectedCount === 0 && (
            <span className="text-amber-500 font-medium">— select at least one sensor above</span>
          )}
        </div>
      </SensorCard>

      {/* ── Export ── */}
      {hasData && (
        <SensorCard title="Export Data" icon={<Download className="h-4 w-4 text-primary" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => rec.downloadCSV(rec.rows)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground group-hover:text-primary">Download CSV</div>
                <div className="text-xs text-muted-foreground">Spreadsheet-compatible format</div>
              </div>
            </button>

            <button
              onClick={() => rec.downloadJSON(rec.rows)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <FileJson className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground group-hover:text-primary">Download JSON</div>
                <div className="text-xs text-muted-foreground">Structured data with metadata</div>
              </div>
            </button>
          </div>

          {/* Share to cloud (only when logged in) */}
          {user && !rec.isRecording && (
            <div className="mt-3">
              {!showShareForm ? (
                <button
                  onClick={() => setShowShareForm(true)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left group w-full"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Share2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary">Share to Cloud</div>
                    <div className="text-xs text-muted-foreground">Save to your profile · visible to connected devices</div>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-primary/30 bg-primary/5">
                  <Upload className="h-4 w-4 text-primary flex-shrink-0" />
                  <input
                    type="text"
                    value={shareTitle}
                    onChange={e => setShareTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleShare()}
                    placeholder="Recording title..."
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleShare}
                    disabled={sharing || !shareTitle.trim()}
                    className="gap-1.5 h-7 flex-shrink-0"
                  >
                    {sharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Share
                  </Button>
                  <button
                    onClick={() => { setShowShareForm(false); setShareTitle(''); }}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border/40">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{rec.rows.length} rows</span>
              {' · '}
              <span className="font-medium text-foreground">{selectedCount}</span> active sensors
            </p>
          </div>
        </SensorCard>
      )}

      {/* ── Preview Table ── */}
      {hasData && (
        <SensorCard title="Recent Samples" icon={<Database className="h-4 w-4 text-indigo-500" />}>
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {['Time', 'Accel X', 'Accel Y', 'Accel Z', 'Gyro X', 'Gyro Y', 'Lat', 'Lng', 'Battery'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rec.rows.slice(-8).reverse().map((row, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-1.5 font-mono text-muted-foreground whitespace-nowrap">{formatElapsed(row.elapsed_ms)}</td>
                    <td className="px-3 py-1.5 font-mono text-violet-400">{row.accel_x ?? '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-violet-400">{row.accel_y ?? '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-violet-400">{row.accel_z ?? '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-pink-400">{row.gyro_x ?? '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-pink-400">{row.gyro_y ?? '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-emerald-400">{row.gps_lat?.toFixed(5) ?? '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-emerald-400">{row.gps_lng?.toFixed(5) ?? '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-yellow-400">{row.battery_level !== null ? `${row.battery_level}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rec.rows.length > 8 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing last 8 of {rec.rows.length} samples
            </p>
          )}
        </SensorCard>
      )}

      {/* ── Empty State ── */}
      {!hasData && !rec.isRecording && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
            <Activity className="h-8 w-8 text-rose-500/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No recording yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pick your sensors above then press <span className="font-medium text-foreground">Start Recording</span>
            </p>
          </div>
          {selectedCount === 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <AlertCircle className="h-3.5 w-3.5" />
              No sensors selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
