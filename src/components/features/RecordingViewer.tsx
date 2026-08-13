import { RecordingRow } from '@/hooks/useRecording';
import { LocalRecording } from '@/hooks/useLocalRecordings';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Download, Activity, Clock, Database, Battery, Wifi, MapPin, Mic, Camera } from 'lucide-react';

interface RecordingViewerProps {
  recording: LocalRecording | {
    id: string;
    title: string;
    rows: RecordingRow[];
    sampleCount: number;
    durationMs: number;
    activeGroups?: string[];
    createdAt: string;
  };
  onClose: () => void;
  onDownload?: () => void;
  ownerName?: string;
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function num(v: number | null | undefined, decimals = 2) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(decimals);
}

const GROUP_ICONS: Record<string, React.ElementType> = {
  Motion: Activity, Location: MapPin, System: Battery,
  Environment: Activity, Network: Wifi, Media: Mic, Device: Camera,
};

export function RecordingViewer({ recording, onClose, onDownload, ownerName }: RecordingViewerProps) {
  const rows = recording.rows || [];

  // Compute stats
  const hasAccel = rows.some(r => r.accel_x !== null);
  const hasGyro  = rows.some(r => r.gyro_x !== null);
  const hasGps   = rows.some(r => r.gps_lat !== null);
  const hasBat   = rows.some(r => r.battery_level !== null);
  const hasNet   = rows.some(r => r.network_type !== null || r.network_effective !== null);
  const hasMic   = rows.some(r => r.mic_level !== null);

  const groups = (recording as LocalRecording).activeGroups ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-border/50 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{recording.title}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
              {ownerName && <span>by <span className="text-foreground/80">{ownerName}</span></span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatElapsed(recording.durationMs)}</span>
              <span className="flex items-center gap-1"><Database className="h-3 w-3" />{recording.sampleCount} samples</span>
              <span>{formatDate(recording.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                title="Download JSON"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Groups / sensors active */}
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {groups.map(g => {
                const Icon = GROUP_ICONS[g] || Activity;
                return (
                  <span key={g} className="flex items-center gap-1 text-[11px] bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 text-primary">
                    <Icon className="h-2.5 w-2.5" />{g}
                  </span>
                );
              })}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {hasAccel && (
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <div className="text-[10px] text-violet-400 font-medium mb-1">Accel avg (m/s²)</div>
                {['x', 'y', 'z'].map(axis => {
                  const vals = rows.map(r => (r as any)[`accel_${axis}`]).filter((v: any) => v !== null) as number[];
                  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                  return <div key={axis} className="text-xs font-mono text-foreground">{axis.toUpperCase()}: {num(avg)}</div>;
                })}
              </div>
            )}
            {hasGyro && (
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="text-[10px] text-purple-400 font-medium mb-1">Gyro avg (°/s)</div>
                {['x', 'y', 'z'].map(axis => {
                  const vals = rows.map(r => (r as any)[`gyro_${axis}`]).filter((v: any) => v !== null) as number[];
                  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                  return <div key={axis} className="text-xs font-mono text-foreground">{axis.toUpperCase()}: {num(avg)}</div>;
                })}
              </div>
            )}
            {hasGps && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[10px] text-emerald-400 font-medium mb-1">GPS</div>
                {(() => {
                  const lats = rows.map(r => r.gps_lat).filter(v => v !== null) as number[];
                  const lngs = rows.map(r => r.gps_lng).filter(v => v !== null) as number[];
                  return (
                    <>
                      <div className="text-xs font-mono text-foreground">Lat: {num(lats[0] ?? null, 5)}</div>
                      <div className="text-xs font-mono text-foreground">Lng: {num(lngs[0] ?? null, 5)}</div>
                    </>
                  );
                })()}
              </div>
            )}
            {hasBat && (
              <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="text-[10px] text-yellow-400 font-medium mb-1">Battery</div>
                {(() => {
                  const levels = rows.map(r => r.battery_level).filter(v => v !== null) as number[];
                  const start = levels[0] ?? null;
                  const end = levels[levels.length - 1] ?? null;
                  return (
                    <>
                      <div className="text-xs font-mono text-foreground">Start: {start !== null ? `${start}%` : '—'}</div>
                      <div className="text-xs font-mono text-foreground">End: {end !== null ? `${end}%` : '—'}</div>
                    </>
                  );
                })()}
              </div>
            )}
            {hasNet && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <div className="text-[10px] text-cyan-400 font-medium mb-1">Network</div>
                {(() => {
                  const types = rows.map(r => r.network_effective || r.network_type).filter(Boolean);
                  const unique = [...new Set(types)];
                  return <div className="text-xs text-foreground">{unique.join(', ') || '—'}</div>;
                })()}
              </div>
            )}
            {hasMic && (
              <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <div className="text-[10px] text-pink-400 font-medium mb-1">Mic Level avg</div>
                {(() => {
                  const vals = rows.map(r => r.mic_level).filter(v => v !== null) as number[];
                  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                  return <div className="text-xs font-mono text-foreground">{avg !== null ? `${avg.toFixed(0)}%` : '—'}</div>;
                })()}
              </div>
            )}
          </div>

          {/* Data table */}
          {rows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Sample Data (last 20)</p>
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      {['Time', 'Accel X', 'Accel Y', 'Accel Z', 'Gyro X', 'GPS Lat', 'GPS Lng', 'Battery', 'Mic'].map(h => (
                        <th key={h} className="px-2.5 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(-20).reverse().map((row, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-2.5 py-1 font-mono text-muted-foreground whitespace-nowrap">{formatElapsed(row.elapsed_ms)}</td>
                        <td className="px-2.5 py-1 font-mono text-violet-400">{num(row.accel_x)}</td>
                        <td className="px-2.5 py-1 font-mono text-violet-400">{num(row.accel_y)}</td>
                        <td className="px-2.5 py-1 font-mono text-violet-400">{num(row.accel_z)}</td>
                        <td className="px-2.5 py-1 font-mono text-purple-400">{num(row.gyro_x)}</td>
                        <td className="px-2.5 py-1 font-mono text-emerald-400">{row.gps_lat?.toFixed(4) ?? '—'}</td>
                        <td className="px-2.5 py-1 font-mono text-emerald-400">{row.gps_lng?.toFixed(4) ?? '—'}</td>
                        <td className="px-2.5 py-1 font-mono text-yellow-400">{row.battery_level !== null ? `${row.battery_level}%` : '—'}</td>
                        <td className="px-2.5 py-1 font-mono text-pink-400">{row.mic_level !== null ? `${row.mic_level}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 20 && (
                <p className="text-xs text-muted-foreground mt-1.5 text-center">
                  Showing last 20 of {rows.length} samples
                </p>
              )}
            </div>
          )}

          {rows.length === 0 && (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
              No sample data in this recording.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
