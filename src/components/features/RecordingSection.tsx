import { useEffect, useState } from 'react';
import { useRecording } from '@/hooks/useRecording';
import { useMotionSensors } from '@/hooks/useMotionSensors';
import { useLocation } from '@/hooks/useLocation';
import { useBattery } from '@/hooks/useBattery';
import { useNetwork } from '@/hooks/useNetwork';
import { useAmbientLight } from '@/hooks/useAmbientLight';
import { useBarometer } from '@/hooks/useBarometer';
import { useMagnetometer } from '@/hooks/useMagnetometer';
import { SensorCard } from '@/components/features/SensorCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Circle, Square, Download, Trash2, FileJson, FileText,
  Activity, Clock, Database, AlertCircle, MapPin, Battery,
  Wifi, Navigation, Wind, SlidersHorizontal,
} from 'lucide-react';

type GroupId = 'motion' | 'location' | 'compass' | 'battery' | 'environment' | 'network';

const SENSOR_GROUPS: {
  id: GroupId;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  activeBorder: string;
  trackBg: string;
}[] = [
  {
    id: 'motion',
    label: 'Motion',
    desc: 'Accel, Gyro & Orientation',
    icon: Activity,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    activeBorder: 'border-violet-500/40',
    trackBg: 'bg-violet-500',
  },
  {
    id: 'location',
    label: 'GPS Location',
    desc: 'Lat, Lng, Accuracy & Speed',
    icon: MapPin,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    activeBorder: 'border-emerald-500/40',
    trackBg: 'bg-emerald-500',
  },
  {
    id: 'compass',
    label: 'Compass',
    desc: 'Magnetometer heading',
    icon: Navigation,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    activeBorder: 'border-blue-500/40',
    trackBg: 'bg-blue-500',
  },
  {
    id: 'battery',
    label: 'Battery',
    desc: 'Level & charging state',
    icon: Battery,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    activeBorder: 'border-yellow-500/40',
    trackBg: 'bg-yellow-500',
  },
  {
    id: 'environment',
    label: 'Environment',
    desc: 'Pressure & ambient light',
    icon: Wind,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    activeBorder: 'border-orange-500/40',
    trackBg: 'bg-orange-500',
  },
  {
    id: 'network',
    label: 'Network',
    desc: 'Connection type & speed',
    icon: Wifi,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    activeBorder: 'border-cyan-500/40',
    trackBg: 'bg-cyan-500',
  },
];

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function RecordingSection() {
  const rec = useRecording();
  const { motionData } = useMotionSensors();
  const { locationData } = useLocation();
  const battery = useBattery();
  const { networkData } = useNetwork();
  const light = useAmbientLight();
  const baro = useBarometer();
  const compass = useMagnetometer();

  const [enabledGroups, setEnabledGroups] = useState<Record<GroupId, boolean>>({
    motion: true,
    location: true,
    compass: true,
    battery: true,
    environment: true,
    network: true,
  });

  const toggleGroup = (id: GroupId) => {
    if (rec.isRecording) return;
    setEnabledGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () =>
    setEnabledGroups({ motion: true, location: true, compass: true, battery: true, environment: true, network: true });
  const clearAll = () =>
    setEnabledGroups({ motion: false, location: false, compass: false, battery: false, environment: false, network: false });

  const selectedCount = Object.values(enabledGroups).filter(Boolean).length;

  useEffect(() => {
    rec.registerDataGetter(() => ({
      accel_x: enabledGroups.motion ? motionData.accelerometer.x : null,
      accel_y: enabledGroups.motion ? motionData.accelerometer.y : null,
      accel_z: enabledGroups.motion ? motionData.accelerometer.z : null,
      gyro_x: enabledGroups.motion ? motionData.gyroscope.x : null,
      gyro_y: enabledGroups.motion ? motionData.gyroscope.y : null,
      gyro_z: enabledGroups.motion ? motionData.gyroscope.z : null,
      orientation_alpha: enabledGroups.motion ? motionData.orientation.alpha : null,
      orientation_beta: enabledGroups.motion ? motionData.orientation.beta : null,
      orientation_gamma: enabledGroups.motion ? motionData.orientation.gamma : null,
      gps_lat: enabledGroups.location ? locationData.latitude : null,
      gps_lng: enabledGroups.location ? locationData.longitude : null,
      gps_accuracy: enabledGroups.location ? locationData.accuracy : null,
      gps_speed: enabledGroups.location ? locationData.speed : null,
      compass_heading: enabledGroups.compass ? compass.heading : null,
      battery_level: enabledGroups.battery ? battery.level : null,
      battery_charging: enabledGroups.battery ? battery.charging : null,
      pressure_hpa: enabledGroups.environment ? baro.pressure : null,
      light_lux: enabledGroups.environment ? light.value : null,
      network_type: enabledGroups.network ? networkData.type : null,
      network_effective: enabledGroups.network ? networkData.effectiveType : null,
    }));
  }, [motionData, locationData, battery, networkData, light, baro, compass, enabledGroups]);

  const hasData = rec.rows.length > 0;
  const activeGroupLabels = SENSOR_GROUPS.filter(g => enabledGroups[g.id]).map(g => g.label).join(', ');

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
            ? 'Sensor groups are locked during an active recording.'
            : 'Toggle the sensor groups you want to capture in this session.'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SENSOR_GROUPS.map(group => {
            const Icon = group.icon;
            const enabled = enabledGroups[group.id];
            return (
              <button
                key={group.id}
                onClick={() => toggleGroup(group.id)}
                disabled={rec.isRecording}
                className={cn(
                  'relative flex items-start gap-2 p-3 rounded-xl border text-left transition-all duration-200 select-none',
                  enabled
                    ? `${group.bg} ${group.activeBorder}`
                    : 'bg-muted/20 border-border/40 opacity-55',
                  !rec.isRecording
                    ? 'hover:scale-[1.02] cursor-pointer active:scale-[0.99]'
                    : 'cursor-not-allowed'
                )}
              >
                {/* Icon bubble */}
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                  enabled ? group.bg : 'bg-muted/60'
                )}>
                  <Icon className={cn('h-3.5 w-3.5', enabled ? group.color : 'text-muted-foreground/50')} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-xs font-semibold leading-tight',
                    enabled ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {group.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    {group.desc}
                  </div>
                </div>

                {/* Mini toggle switch */}
                <div className={cn(
                  'flex-shrink-0 w-8 h-4 rounded-full transition-colors duration-200 mt-1',
                  enabled ? group.trackBg : 'bg-muted-foreground/25'
                )}>
                  <div className={cn(
                    'w-3 h-3 rounded-full bg-white shadow mt-0.5 transition-transform duration-200',
                    enabled ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer row */}
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            <span className={cn('font-medium', selectedCount > 0 ? 'text-foreground' : 'text-amber-500')}>
              {selectedCount}
            </span>
            {' '}/ {SENSOR_GROUPS.length} groups selected
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
                {rec.rows.length} samples · {selectedCount} sensor {selectedCount === 1 ? 'group' : 'groups'}
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
            <span className="text-amber-500 font-medium">— select at least one sensor group above</span>
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

          <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border/40">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{rec.rows.length} rows</span>
              {activeGroupLabels && <> · Groups: {activeGroupLabels}</>}
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
              Pick your sensor groups above then press <span className="font-medium text-foreground">Start Recording</span>
            </p>
          </div>
          {selectedCount === 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <AlertCircle className="h-3.5 w-3.5" />
              No sensor groups selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
