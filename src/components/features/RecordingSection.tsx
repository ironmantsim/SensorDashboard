import { useEffect, useState, useRef } from 'react';
import { useRecording } from '@/hooks/useRecording';
import { useLocalRecordings, LocalRecording } from '@/hooks/useLocalRecordings';
import { useMotionSensors } from '@/hooks/useMotionSensors';
import { useLocation } from '@/hooks/useLocation';
import { useBattery } from '@/hooks/useBattery';
import { useNetwork } from '@/hooks/useNetwork';
import { useAmbientLight } from '@/hooks/useAmbientLight';
import { useBarometer } from '@/hooks/useBarometer';
import { useMagnetometer } from '@/hooks/useMagnetometer';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';
import { useAudio } from '@/hooks/useAudio';
import { useCamera } from '@/hooks/useCamera';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { SensorCard } from '@/components/features/SensorCard';
import { RecordingViewer } from '@/components/features/RecordingViewer';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Circle, Square, Download, Trash2, FileJson, FileText,
  Activity, Clock, Database, AlertCircle, SlidersHorizontal,
  Share2, Upload, Loader2, X as XIcon, Zap, RotateCcw,
  Compass, MapPin, Battery, BatteryCharging, Gauge, Sun,
  Wifi, Signal, Lock, ArrowDown, Mic, Camera, Monitor,
  Globe, HardDrive, Cpu, Pencil, Check, Eye, Star, CloudOff,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type SensorId =
  | 'accel' | 'gyro' | 'orientation'
  | 'gps' | 'magnetometer'
  | 'battery_level' | 'battery_charging'
  | 'barometer' | 'ambient_light'
  | 'network_type' | 'network_speed' | 'network_downlink' | 'network_rtt'
  | 'mic_level' | 'cam_active'
  | 'device_os' | 'device_browser' | 'device_memory' | 'device_cpu';

type PermState = 'granted' | 'denied' | 'unknown' | 'unsupported';

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
}

const SENSORS: SensorDef[] = [
  { id: 'accel',        label: 'Accelerometer',  desc: 'accel_x · accel_y · accel_z (m/s²)', icon: Zap,           color: 'text-violet-400', bg: 'bg-violet-500/10', activeBorder: 'border-violet-500/40', trackBg: 'bg-violet-500',  group: 'Motion' },
  { id: 'gyro',         label: 'Gyroscope',       desc: 'gyro_x · gyro_y · gyro_z (°/s)',     icon: RotateCcw,     color: 'text-purple-400', bg: 'bg-purple-500/10', activeBorder: 'border-purple-500/40', trackBg: 'bg-purple-500',  group: 'Motion' },
  { id: 'orientation',  label: 'Orientation',     desc: 'alpha · beta · gamma (°)',            icon: Activity,      color: 'text-fuchsia-400',bg: 'bg-fuchsia-500/10',activeBorder: 'border-fuchsia-500/40',trackBg: 'bg-fuchsia-500', group: 'Motion' },
  { id: 'gps',          label: 'GPS Location',    desc: 'lat · lng · accuracy · speed',        icon: MapPin,        color: 'text-emerald-400',bg: 'bg-emerald-500/10',activeBorder: 'border-emerald-500/40',trackBg: 'bg-emerald-500', group: 'Location' },
  { id: 'magnetometer', label: 'Magnetometer',    desc: 'compass_heading (0–360°)',             icon: Compass,       color: 'text-blue-400',   bg: 'bg-blue-500/10',   activeBorder: 'border-blue-500/40',   trackBg: 'bg-blue-500',    group: 'Location' },
  { id: 'battery_level',   label: 'Battery Level',  desc: 'battery_level (%)',       icon: Battery,        color: 'text-yellow-400', bg: 'bg-yellow-500/10', activeBorder: 'border-yellow-500/40', trackBg: 'bg-yellow-500', group: 'System' },
  { id: 'battery_charging', label: 'Charging State', desc: 'battery_charging (bool)', icon: BatteryCharging,color: 'text-lime-400',   bg: 'bg-lime-500/10',   activeBorder: 'border-lime-500/40',   trackBg: 'bg-lime-500',   group: 'System' },
  { id: 'barometer',    label: 'Barometer',       desc: 'pressure_hpa (hPa)',                  icon: Gauge,   color: 'text-orange-400', bg: 'bg-orange-500/10', activeBorder: 'border-orange-500/40', trackBg: 'bg-orange-500', group: 'Environment' },
  { id: 'ambient_light',label: 'Ambient Light',   desc: 'light_lux (lux)',                     icon: Sun,     color: 'text-amber-400',  bg: 'bg-amber-500/10',  activeBorder: 'border-amber-500/40',  trackBg: 'bg-amber-500',  group: 'Environment' },
  { id: 'network_type',    label: 'Network Type',    desc: 'network_type',          icon: Wifi,      color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   activeBorder: 'border-cyan-500/40',   trackBg: 'bg-cyan-500',   group: 'Network' },
  { id: 'network_speed',   label: 'Effective Speed', desc: 'network_effective',     icon: Signal,    color: 'text-sky-400',    bg: 'bg-sky-500/10',    activeBorder: 'border-sky-500/40',    trackBg: 'bg-sky-500',    group: 'Network' },
  { id: 'network_downlink',label: 'Downlink (Mbps)', desc: 'network_downlink_mbps', icon: ArrowDown, color: 'text-teal-400',   bg: 'bg-teal-500/10',   activeBorder: 'border-teal-500/40',   trackBg: 'bg-teal-500',   group: 'Network' },
  { id: 'network_rtt',     label: 'Round-trip Time', desc: 'network_rtt_ms (ms)',   icon: Clock,     color: 'text-indigo-400', bg: 'bg-indigo-500/10', activeBorder: 'border-indigo-500/40', trackBg: 'bg-indigo-500', group: 'Network' },
  { id: 'mic_level',  label: 'Microphone Level', desc: 'mic_level (0–100)',    icon: Mic,    color: 'text-pink-400', bg: 'bg-pink-500/10', activeBorder: 'border-pink-500/40', trackBg: 'bg-pink-500', group: 'Media' },
  { id: 'cam_active', label: 'Camera Active',    desc: 'cam_active (boolean)', icon: Camera, color: 'text-rose-400', bg: 'bg-rose-500/10', activeBorder: 'border-rose-500/40', trackBg: 'bg-rose-500', group: 'Media' },
  { id: 'device_os',      label: 'Operating System', desc: 'device_os',           icon: Monitor,   color: 'text-slate-400',   bg: 'bg-slate-500/10',   activeBorder: 'border-slate-500/40',   trackBg: 'bg-slate-500',   group: 'Device' },
  { id: 'device_browser', label: 'Browser',          desc: 'device_browser',      icon: Globe,     color: 'text-zinc-400',    bg: 'bg-zinc-500/10',    activeBorder: 'border-zinc-500/40',    trackBg: 'bg-zinc-500',    group: 'Device' },
  { id: 'device_memory',  label: 'Device Memory',    desc: 'device_memory_gb',    icon: HardDrive, color: 'text-neutral-400', bg: 'bg-neutral-500/10', activeBorder: 'border-neutral-500/40', trackBg: 'bg-neutral-500', group: 'Device' },
  { id: 'device_cpu',     label: 'CPU Cores',        desc: 'device_cpu_cores',    icon: Cpu,       color: 'text-stone-400',   bg: 'bg-stone-500/10',   activeBorder: 'border-stone-500/40',   trackBg: 'bg-stone-500',   group: 'Device' },
];

const GROUPS = ['Motion', 'Location', 'System', 'Environment', 'Network', 'Media', 'Device'];

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Recording History Item ─────────────────────────────────────────────────
interface RecHistoryItemProps {
  rec: LocalRecording;
  user: { id: string; plan: string } | null;
  sharedCount: number;
  onView: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onShareToggle: () => void;
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
  sharing: boolean;
}

function RecHistoryItem({
  rec, user, sharedCount, onView, onRename, onDelete, onShareToggle,
  onDownloadCsv, onDownloadJson, sharing,
}: RecHistoryItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(rec.title);
  const MAX_GROUP_SHARES = 10;
  const canShareMore = rec.sharedToGroup || (user?.plan === 'pro' || sharedCount < MAX_GROUP_SHARES);

  return (
    <div className="p-3 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
          <Activity className="h-3.5 w-3.5 text-rose-400" />
        </div>
        {editing ? (
          <div className="flex-1 flex items-center gap-1.5">
            <input
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onRename(editTitle); setEditing(false); }
                if (e.key === 'Escape') { setEditTitle(rec.title); setEditing(false); }
              }}
              className="flex-1 min-w-0 bg-transparent border-b border-primary/50 text-sm text-foreground outline-none pb-0.5"
            />
            <button onClick={() => { onRename(editTitle); setEditing(false); }} className="text-primary">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setEditTitle(rec.title); setEditing(false); }} className="text-muted-foreground">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground truncate">{rec.title}</span>
              {rec.sharedToGroup && (
                <span className="flex items-center gap-0.5 text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
                  <Share2 className="h-2.5 w-2.5" />Group
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {formatDate(rec.createdAt)} · {formatElapsed(rec.durationMs)} · {rec.sampleCount} samples
            </div>
          </div>
        )}
      </div>

      {/* Groups */}
      {rec.activeGroups.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 ml-10">
          {rec.activeGroups.map(g => (
            <span key={g} className="text-[10px] bg-muted/50 border border-border/40 rounded-full px-1.5 py-0.5 text-muted-foreground">{g}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 ml-10 flex-wrap">
        <button onClick={onView} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          <Eye className="h-3 w-3" /> View
        </button>
        <span className="text-border">·</span>
        <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="h-3 w-3" /> Rename
        </button>
        <span className="text-border">·</span>
        <button onClick={onDownloadCsv} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <FileText className="h-3 w-3" /> CSV
        </button>
        <button onClick={onDownloadJson} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <FileJson className="h-3 w-3" /> JSON
        </button>
        {user && (
          <>
            <span className="text-border">·</span>
            {!canShareMore && !rec.sharedToGroup ? (
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <Star className="h-3 w-3" /> 10 limit reached
              </span>
            ) : (
              <button
                onClick={onShareToggle}
                disabled={sharing}
                className={cn(
                  'flex items-center gap-1 text-xs transition-colors',
                  rec.sharedToGroup
                    ? 'text-violet-400 hover:text-red-400'
                    : 'text-muted-foreground hover:text-violet-400'
                )}
              >
                {sharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
                {rec.sharedToGroup ? 'Remove from Group' : 'Share to Group'}
              </button>
            )}
          </>
        )}
        <span className="text-border">·</span>
        <button onClick={onDelete} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors">
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function RecordingSection() {
  const rec = useRecording();
  const { user } = useAuth();
  const local = useLocalRecordings();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { motionData, hasPermission: motionPerm, requestPermission: requestMotionPerm } = useMotionSensors();
  const { locationData, requestLocation, isWatching } = useLocation();
  const battery = useBattery();
  const { networkData } = useNetwork();
  const light = useAmbientLight();
  const baro = useBarometer();
  const compass = useMagnetometer();
  const deviceInfo = useDeviceInfo();
  const { audioData, requestMicrophone } = useAudio();
  const { stream: cameraStream, hasPermission: cameraPermission, startCamera } = useCamera();

  // ── Sensor selection ──
  const [enabled, setEnabled] = useState<Record<SensorId, boolean>>({
    accel: true, gyro: true, orientation: true,
    gps: false, magnetometer: true,
    battery_level: true, battery_charging: true,
    barometer: true, ambient_light: true,
    network_type: true, network_speed: true, network_downlink: true, network_rtt: true,
    mic_level: false, cam_active: false,
    device_os: true, device_browser: true, device_memory: true, device_cpu: true,
  });

  const toggle = (id: SensorId) => { if (rec.isRecording) return; setEnabled(prev => ({ ...prev, [id]: !prev[id] })); };
  const selectAll = () => setEnabled(Object.fromEntries(SENSORS.map(s => [s.id, true])) as Record<SensorId, boolean>);
  const clearAll  = () => setEnabled(Object.fromEntries(SENSORS.map(s => [s.id, false])) as Record<SensorId, boolean>);

  // Auto-start sensors
  const locationStarted = useRef(false);
  const micStarted = useRef(false);
  const camStarted = useRef(false);

  useEffect(() => {
    if (enabled.gps && !isWatching && !locationStarted.current) { locationStarted.current = true; requestLocation(); }
  }, [enabled.gps]);

  useEffect(() => {
    if (enabled.mic_level && !audioData.isActive && audioData.hasPermission !== false && !micStarted.current) { micStarted.current = true; requestMicrophone(); }
  }, [enabled.mic_level]);

  useEffect(() => {
    if (enabled.cam_active && !cameraStream && cameraPermission !== false && !camStarted.current) { camStarted.current = true; startCamera(); }
  }, [enabled.cam_active]);

  // Permission state
  const permState = (id: SensorId): PermState => {
    switch (id) {
      case 'accel': case 'gyro': case 'orientation':
        if (motionPerm === false) return 'denied';
        if (motionData.accelerometer.x !== null || motionData.gyroscope.x !== null || motionData.orientation.alpha !== null) return 'granted';
        return 'unknown';
      case 'gps':
        if (locationData.latitude !== null) return 'granted';
        if (locationData.error?.toLowerCase().includes('denied')) return 'denied';
        return 'unknown';
      case 'magnetometer':
        if (!compass.supported) return 'unsupported';
        if (compass.hasPermission === false) return 'denied';
        if (compass.heading !== null) return 'granted';
        return 'unknown';
      case 'battery_level': case 'battery_charging':
        if (!battery.supported) return 'unsupported';
        return battery.level !== null ? 'granted' : 'unknown';
      case 'barometer':
        if (!baro.supported) return 'unsupported';
        if (baro.hasPermission === false) return 'denied';
        return baro.pressure !== null ? 'granted' : 'unknown';
      case 'ambient_light':
        if (!light.supported) return 'unsupported';
        if (light.hasPermission === false) return 'denied';
        return light.value !== null ? 'granted' : 'unknown';
      case 'network_type': case 'network_speed': case 'network_downlink': case 'network_rtt':
        return networkData.online ? 'granted' : 'unknown';
      case 'mic_level':
        if (audioData.hasPermission === false) return 'denied';
        return audioData.isActive ? 'granted' : 'unknown';
      case 'cam_active':
        if (cameraPermission === false) return 'denied';
        return cameraStream !== null ? 'granted' : 'unknown';
      case 'device_os': case 'device_browser': case 'device_memory': case 'device_cpu':
        return 'granted';
      default: return 'unknown';
    }
  };

  const isBlocked = (id: SensorId) => { const p = permState(id); return p === 'denied' || p === 'unsupported'; };

  const getPermRequestFn = (id: SensorId): (() => void) | null => {
    if (permState(id) !== 'denied') return null;
    switch (id) {
      case 'accel': case 'gyro': case 'orientation': return requestMotionPerm;
      case 'gps': return () => { locationStarted.current = false; requestLocation(); };
      case 'magnetometer': return compass.requestPermission;
      case 'barometer': return baro.requestPermission;
      case 'ambient_light': return light.requestPermission;
      case 'mic_level': return () => { micStarted.current = false; requestMicrophone(); };
      case 'cam_active': return () => { camStarted.current = false; startCamera(); };
      default: return null;
    }
  };

  // Data getter
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
      network_downlink: enabled.network_downlink ? networkData.downlink : null,
      network_rtt: enabled.network_rtt ? networkData.rtt : null,
      mic_level: enabled.mic_level ? audioData.level : null,
      cam_active: enabled.cam_active ? (cameraStream !== null) : null,
      device_os: enabled.device_os ? deviceInfo.os : null,
      device_browser: enabled.device_browser ? deviceInfo.browser : null,
      device_memory_gb: enabled.device_memory ? deviceInfo.deviceMemory : null,
      device_cpu_cores: enabled.device_cpu ? deviceInfo.hardwareConcurrency : null,
    }));
  }, [motionData, locationData, battery, networkData, light, baro, compass, deviceInfo, audioData, cameraStream, enabled]);

  // ── Recording controls ──
  const [recordingTitle, setRecordingTitle] = useState('');
  const [showTitleInput, setShowTitleInput] = useState(false);

  const handleStop = () => {
    rec.stopRecording();
    setShowTitleInput(true);
  };

  const handleSaveLocal = () => {
    const activeGroups = [...new Set(SENSORS.filter(s => enabled[s.id]).map(s => s.group))];
    const title = recordingTitle.trim() || `Recording ${new Date().toLocaleString()}`;
    local.saveRecording(rec.rows, rec.elapsed, activeGroups, title);
    rec.clearRecording();
    setShowTitleInput(false);
    setRecordingTitle('');
    toast.success('Recording saved locally!');
  };

  // ── History actions ──
  const [viewingRec, setViewingRec] = useState<LocalRecording | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const sharedCount = local.recordings.filter(r => r.sharedToGroup).length;

  const handleShareToggle = async (recItem: LocalRecording) => {
    if (!user) return toast.error('Sign in to share recordings');
    setSharingId(recItem.id);

    if (recItem.sharedToGroup && recItem.cloudId) {
      // Remove from group
      const ok = await confirm({
        title: 'Remove from Group?',
        description: 'This recording will no longer be visible to your connected friends.',
        confirmLabel: 'Remove',
        variant: 'warning',
      });
      if (!ok) { setSharingId(null); return; }
      await supabase.from('shared_recordings').delete().eq('id', recItem.cloudId);
      local.markUnshared(recItem.id);
      toast.success('Removed from group');
    } else {
      // Share to group
      const activeGroups = recItem.activeGroups;
      const { data, error } = await supabase
        .from('shared_recordings')
        .insert({
          owner_id: user.id,
          title: recItem.title,
          data: recItem.rows,
          sensor_groups: activeGroups,
          sample_count: recItem.sampleCount,
          duration_ms: recItem.durationMs,
        })
        .select('id')
        .single();
      if (error) { toast.error('Failed to share: ' + error.message); }
      else {
        local.markShared(recItem.id, data.id);
        toast.success('Shared to group!');
      }
    }
    setSharingId(null);
  };

  const handleDelete = async (recItem: LocalRecording) => {
    const ok = await confirm({
      title: 'Delete Recording?',
      description: `"${recItem.title}" will be permanently deleted from this device.${recItem.sharedToGroup ? ' It will also be removed from the group.' : ''}`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    if (recItem.sharedToGroup && recItem.cloudId) {
      await supabase.from('shared_recordings').delete().eq('id', recItem.cloudId);
    }
    local.deleteRecording(recItem.id);
    toast.success('Recording deleted');
  };

  const selectedCount = Object.values(enabled).filter(Boolean).length;
  const hasLiveData = rec.rows.length > 0;
  const groupedSensors = GROUPS.map(group => ({ group, sensors: SENSORS.filter(s => s.group === group) }));

  return (
    <div className="space-y-4">
      {confirmDialog}
      {viewingRec && (
        <RecordingViewer
          recording={viewingRec}
          onClose={() => setViewingRec(null)}
          onDownload={() => {
            const blob = new Blob([JSON.stringify({ recorded_at: viewingRec.createdAt, samples: viewingRec.rows }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${viewingRec.title}.json`; a.click(); URL.revokeObjectURL(url);
          }}
        />
      )}

      <h2 className="section-title flex items-center gap-2">
        <Activity className="h-5 w-5 text-rose-500" /> Sensor Recording
      </h2>

      {/* ── Sensor Selection ── */}
      <SensorCard title="Sensor Selection" icon={<SlidersHorizontal className="h-4 w-4 text-rose-400" />}>
        <p className="text-xs text-muted-foreground mb-3">
          {rec.isRecording ? 'Sensor selection locked during recording.' : 'Toggle each sensor. Blurred = needs permission.'}
        </p>
        <div className="space-y-4">
          {groupedSensors.map(({ group, sensors }) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-border/40" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">{group}</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sensors.map(sensor => {
                  const Icon = sensor.icon;
                  const isOn = enabled[sensor.id];
                  const pState = permState(sensor.id);
                  const blocked = isBlocked(sensor.id);
                  const reqFn = getPermRequestFn(sensor.id);
                  return (
                    <div key={sensor.id} className="relative">
                      <button
                        onClick={() => !blocked && toggle(sensor.id)}
                        disabled={rec.isRecording}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 select-none',
                          blocked ? 'opacity-30 blur-[0.5px] grayscale cursor-not-allowed bg-muted/10 border-border/30 pointer-events-none'
                            : isOn ? `${sensor.bg} ${sensor.activeBorder} cursor-pointer hover:scale-[1.01]`
                            : 'bg-muted/20 border-border/40 opacity-60 cursor-pointer hover:opacity-80',
                          rec.isRecording && !blocked && 'cursor-not-allowed',
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', blocked ? 'bg-muted/60' : isOn ? sensor.bg : 'bg-muted/40')}>
                          <Icon className={cn('h-3.5 w-3.5', isOn && !blocked ? sensor.color : 'text-muted-foreground/50')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn('text-xs font-semibold leading-tight', blocked ? 'text-muted-foreground/60' : isOn ? 'text-foreground' : 'text-muted-foreground')}>{sensor.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono leading-snug truncate">{sensor.desc}</div>
                        </div>
                        {!blocked && (
                          <div className={cn('flex-shrink-0 w-8 h-4 rounded-full transition-colors duration-200', isOn ? sensor.trackBg : 'bg-muted-foreground/25')}>
                            <div className={cn('w-3 h-3 rounded-full bg-white shadow mt-0.5 transition-transform duration-200', isOn ? 'translate-x-4' : 'translate-x-0.5')} />
                          </div>
                        )}
                      </button>
                      {blocked && pState === 'denied' && reqFn && (
                        <button onClick={reqFn} disabled={rec.isRecording} className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/65 backdrop-blur-[2px] border border-dashed border-primary/40 hover:bg-primary/10 transition-colors">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Lock className="h-3 w-3" />Grant Permission</span>
                        </button>
                      )}
                      {blocked && pState === 'unsupported' && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl pointer-events-none">
                          <span className="text-[10px] bg-muted/90 border border-border/50 rounded-full px-2 py-0.5 text-muted-foreground">Not available on this device</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            <span className={cn('font-medium', selectedCount > 0 ? 'text-foreground' : 'text-amber-500')}>{selectedCount}</span> / {SENSORS.length} selected
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

      {/* ── Recording Controls ── */}
      <SensorCard
        title="Recording Controls"
        icon={<Circle className={cn('h-4 w-4', rec.isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground')} />}
        live={rec.isRecording}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn('w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors', rec.isRecording ? 'border-red-500 bg-red-500/10' : 'border-border bg-muted/30')}>
              {rec.isRecording ? <div className="w-3.5 h-3.5 rounded bg-red-500 animate-pulse" /> : <Circle className="h-5 w-5 text-muted-foreground/40" />}
            </div>
            <div>
              <div className={cn('text-2xl font-mono font-bold tabular-nums', rec.isRecording ? 'text-red-500' : 'text-foreground')}>{formatElapsed(rec.elapsed)}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Database className="h-3 w-3" />{rec.rows.length} samples · {selectedCount} sensors
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {!rec.isRecording ? (
              <Button onClick={rec.startRecording} disabled={selectedCount === 0} className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white gap-1.5 disabled:opacity-40" size="sm">
                <Circle className="h-3.5 w-3.5 fill-white" />Start Recording
              </Button>
            ) : (
              <Button onClick={handleStop} variant="outline" className="flex-1 sm:flex-none border-red-500/40 text-red-500 hover:bg-red-500/10 gap-1.5" size="sm">
                <Square className="h-3.5 w-3.5 fill-current" />Stop
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />Sampling at 2 Hz (every 500 ms)
          {selectedCount === 0 && <span className="text-amber-500 font-medium">— select at least one sensor</span>}
        </div>
      </SensorCard>

      {/* ── Save prompt after stopping ── */}
      {showTitleInput && !rec.isRecording && hasLiveData && (
        <SensorCard title="Save Recording" icon={<Download className="h-4 w-4 text-primary" />}>
          <p className="text-xs text-muted-foreground mb-3">
            Recording finished — {rec.rows.length} samples captured. Give it a title and save locally.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-muted/20 focus-within:border-primary/60 transition-colors">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={recordingTitle}
                onChange={e => setRecordingTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveLocal()}
                placeholder={`Recording ${new Date().toLocaleString()}`}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <Button onClick={handleSaveLocal} size="sm" className="gap-1.5 flex-shrink-0">
              <Download className="h-3.5 w-3.5" />Save
            </Button>
            <Button
              onClick={() => { rec.clearRecording(); setShowTitleInput(false); setRecordingTitle(''); }}
              variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </SensorCard>
      )}

      {/* ── Recording History ── */}
      <SensorCard
        title={`Recording History (${local.recordings.length})`}
        icon={<Database className="h-4 w-4 text-indigo-500" />}
      >
        {local.recordings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CloudOff className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No saved recordings yet</p>
            <p className="text-xs text-muted-foreground/70">Start a recording above and save it to see history here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {local.recordings.map(r => (
              <RecHistoryItem
                key={r.id}
                rec={r}
                user={user}
                sharedCount={sharedCount}
                onView={() => setViewingRec(r)}
                onRename={title => local.renameRecording(r.id, title)}
                onDelete={() => handleDelete(r)}
                onShareToggle={() => handleShareToggle(r)}
                onDownloadCsv={() => {
                  const rows = r.rows;
                  if (!rows.length) return;
                  const headers = Object.keys(rows[0]);
                  const csv = [headers.join(','), ...rows.map(row => headers.map(h => { const v = (row as any)[h]; return v === null ? '' : String(v); }).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${r.title}.csv`; a.click(); URL.revokeObjectURL(url);
                }}
                onDownloadJson={() => {
                  const blob = new Blob([JSON.stringify({ recorded_at: r.createdAt, samples: r.rows }, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${r.title}.json`; a.click(); URL.revokeObjectURL(url);
                }}
                sharing={sharingId === r.id}
              />
            ))}
            {!user && (
              <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-primary" />
                Sign in to share recordings to your group and access them from any device (Pro).
              </div>
            )}
            {user?.plan === 'normal' && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                Normal plan: {sharedCount}/10 group shares used.{' '}
                <span className="text-amber-500 font-medium">Upgrade to Pro</span> for unlimited shares.
              </div>
            )}
          </div>
        )}
      </SensorCard>

      {/* ── Empty state ── */}
      {!hasLiveData && !rec.isRecording && !showTitleInput && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center">
            <Activity className="h-7 w-7 text-rose-500/40" />
          </div>
          <p className="text-sm font-medium text-foreground">Select sensors and start recording</p>
          {selectedCount === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500">
              <AlertCircle className="h-3.5 w-3.5" />No sensors selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
