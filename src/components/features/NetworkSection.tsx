import { SensorCard, ValueRow } from '@/components/features/SensorCard';
import { useNetwork } from '@/hooks/useNetwork';
import { useSpeedTest } from '@/hooks/useSpeedTest';
import { Wifi, WifiOff, Globe, Zap, Download, Upload, Play, Square, RotateCcw, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  bluetooth: 'Bluetooth',
  cellular: 'Cellular',
  ethernet: 'Ethernet',
  none: 'No Connection',
  other: 'Other',
  unknown: 'Unknown',
};

const EFFECTIVE_LABELS: Record<string, { label: string; color: string }> = {
  'slow-2g': { label: 'Slow 2G', color: 'text-red-500' },
  '2g': { label: '2G', color: 'text-orange-500' },
  '3g': { label: '3G', color: 'text-yellow-500' },
  '4g': { label: '4G / LTE', color: 'text-green-500' },
};

function speedColor(mbps: number | null): string {
  if (mbps === null) return 'text-muted-foreground';
  if (mbps < 1) return 'text-red-500';
  if (mbps < 5) return 'text-orange-500';
  if (mbps < 25) return 'text-yellow-500';
  if (mbps < 100) return 'text-green-500';
  return 'text-cyan-400';
}

function speedLabel(mbps: number | null): string {
  if (mbps === null) return '—';
  if (mbps < 1) return 'Very Slow';
  if (mbps < 5) return 'Slow';
  if (mbps < 25) return 'Moderate';
  if (mbps < 100) return 'Fast';
  return 'Very Fast';
}

// Radial gauge needle/arc for the big speed display
function SpeedDialGauge({ mbps, max = 200, active }: { mbps: number | null; max?: number; active: boolean }) {
  const pct = mbps !== null ? Math.min(1, mbps / max) : 0;
  const angle = -135 + pct * 270; // -135 to +135 degrees
  const r = 70;
  const cx = 90, cy = 90;

  // Arc path helper
  function polarToCartesian(angle: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(startAngle: number, endAngle: number) {
    const s = polarToCartesian(startAngle);
    const e = polarToCartesian(endAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const trackStart = -135 + 90; // -45 in SVG coords
  const trackEnd = 135 + 90;    // +225 in SVG coords
  const fillEnd = -135 + 90 + pct * 270;

  const needle = polarToCartesian(angle + 90);

  return (
    <svg viewBox="0 0 180 120" className="w-full max-w-[240px]">
      {/* Track arc */}
      <path
        d={describeArc(-45, 225)}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Fill arc */}
      {pct > 0 && (
        <path
          d={describeArc(-45, -45 + pct * 270)}
          fill="none"
          stroke={mbps !== null && mbps < 5 ? '#f97316' : mbps !== null && mbps < 25 ? '#eab308' : '#06b6d4'}
          strokeWidth="10"
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      )}
      {/* Tick marks */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const a = -135 + t * 270;
        const inner = { x: cx + (r - 14) * Math.cos((a - 90) * Math.PI / 180), y: cy + (r - 14) * Math.sin((a - 90) * Math.PI / 180) };
        const outer = { x: cx + (r - 6) * Math.cos((a - 90) * Math.PI / 180), y: cy + (r - 6) * Math.sin((a - 90) * Math.PI / 180) };
        return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="hsl(var(--border))" strokeWidth="1.5" />;
      })}
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needle.x}
        y2={needle.y}
        stroke="#06b6d4"
        strokeWidth="2"
        strokeLinecap="round"
        className="transition-all duration-300"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      <circle cx={cx} cy={cy} r="5" fill="#06b6d4" />
      {/* Center text */}
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="monospace"
        fill={active ? '#06b6d4' : 'hsl(var(--foreground))'}>
        {mbps !== null ? (mbps >= 100 ? Math.round(mbps) : mbps.toFixed(1)) : '—'}
      </text>
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">Mbps</text>
      {/* Scale labels */}
      <text x="20" y="108" textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))">0</text>
      <text x="160" y="108" textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))">{max}</text>
    </svg>
  );
}

export function NetworkSection() {
  const { networkData, supported } = useNetwork();
  const { result, liveMbps, start, stop, reset } = useSpeedTest();

  const effInfo = networkData.effectiveType ? EFFECTIVE_LABELS[networkData.effectiveType] : null;
  const isRunning = result.status === 'downloading' || result.status === 'uploading';
  const isDone = result.status === 'done';

  const displayMbps = isRunning ? liveMbps : (result.status === 'downloading' ? result.downloadMbps : result.uploadMbps);

  return (
    <div className="space-y-4">
      <h2 className="section-title flex items-center gap-2">
        <Wifi className="h-5 w-5 text-cyan-500" /> Network Information
      </h2>

      {/* Online/Offline Banner */}
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-xl border',
        networkData.online
          ? 'bg-green-500/10 border-green-500/20'
          : 'bg-red-500/10 border-red-500/20'
      )}>
        {networkData.online
          ? <Wifi className="h-5 w-5 text-green-500" />
          : <WifiOff className="h-5 w-5 text-red-500" />
        }
        <div>
          <p className={cn('text-sm font-semibold', networkData.online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {networkData.online ? 'Connected to Internet' : 'No Internet Connection'}
          </p>
          <p className="text-xs text-muted-foreground">
            {networkData.online ? 'Your device is online.' : 'Check your network settings.'}
          </p>
        </div>
      </div>

      {/* ─── Speed Test ─── */}
      <SensorCard
        title="Speed Test"
        icon={<Signal className="h-4 w-4 text-cyan-500" />}
        live={isRunning}
      >
        {/* Gauge + live display */}
        <div className="flex flex-col items-center gap-2 py-2">
          <SpeedDialGauge
            mbps={isRunning ? liveMbps : (isDone ? (result.status === 'done' ? (result.downloadMbps ?? null) : null) : null)}
            active={isRunning}
          />

          {/* Phase label */}
          <div className="text-xs font-medium text-muted-foreground h-4">
            {result.status === 'idle' && 'Press Start to measure your internet speed'}
            {result.status === 'downloading' && (
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Download className="h-3.5 w-3.5 animate-bounce" /> Measuring download speed…
              </span>
            )}
            {result.status === 'uploading' && (
              <span className="flex items-center gap-1.5 text-violet-400">
                <Upload className="h-3.5 w-3.5 animate-bounce" /> Measuring upload speed…
              </span>
            )}
            {result.status === 'done' && (
              <span className={cn('font-semibold', speedColor(result.downloadMbps))}>
                {speedLabel(result.downloadMbps)} — {result.downloadMbps?.toFixed(1)} Mbps down
              </span>
            )}
            {result.status === 'error' && (
              <span className="text-red-400">Test failed: {result.error}</span>
            )}
          </div>

          {/* Progress bar */}
          {(isRunning || isDone) && (
            <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  result.status === 'uploading' ? 'bg-violet-500' : 'bg-cyan-500'
                )}
                style={{ width: `${result.progress}%` }}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 mt-2">
            {!isRunning ? (
              <Button
                size="sm"
                onClick={start}
                disabled={!networkData.online}
                className="gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white border-0 shadow-md shadow-cyan-500/20"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                {isDone || result.status === 'error' ? 'Run Again' : 'Start Test'}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={stop}
                className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </Button>
            )}
            {(isDone || result.status === 'error') && (
              <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Results grid */}
        {(isDone || result.downloadMbps !== null || result.pingMs !== null) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/50">
            {[
              {
                icon: Download,
                label: 'Download',
                value: result.downloadMbps,
                unit: 'Mbps',
                color: 'text-cyan-500',
                bg: 'bg-cyan-500/10',
              },
              {
                icon: Upload,
                label: 'Upload',
                value: result.uploadMbps,
                unit: 'Mbps',
                color: 'text-violet-500',
                bg: 'bg-violet-500/10',
              },
              {
                icon: Zap,
                label: 'Ping',
                value: result.pingMs,
                unit: 'ms',
                color: result.pingMs !== null && result.pingMs < 50 ? 'text-green-500' : result.pingMs !== null && result.pingMs < 100 ? 'text-yellow-500' : 'text-red-500',
                bg: 'bg-yellow-500/10',
              },
              {
                icon: Signal,
                label: 'Jitter',
                value: result.jitterMs,
                unit: 'ms',
                color: 'text-indigo-400',
                bg: 'bg-indigo-500/10',
              },
            ].map(({ icon: Icon, label, value, unit, color, bg }) => (
              <div key={label} className={cn('rounded-xl p-3 flex flex-col gap-1', bg)}>
                <div className="flex items-center gap-1.5">
                  <Icon className={cn('h-3.5 w-3.5', color)} />
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
                <div className={cn('text-lg font-bold font-mono leading-none', value !== null ? color : 'text-muted-foreground/40')}>
                  {value !== null ? (value >= 10 ? Math.round(value) : value.toFixed(1)) : '—'}
                </div>
                <div className="text-[10px] text-muted-foreground">{unit}</div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-3">
          Uses Cloudflare & public endpoints to measure real internet throughput. Results may vary by server distance.
        </p>
      </SensorCard>

      {/* Connection Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SensorCard title="Connection Info" icon={<Globe className="h-4 w-4 text-cyan-500" />} live={networkData.online}>
          <ValueRow
            label="Connection Type"
            value={networkData.type ? TYPE_LABELS[networkData.type] ?? networkData.type : null}
            highlight
          />
          <ValueRow
            label="Effective Type"
            value={networkData.effectiveType?.toUpperCase()}
          />
          <ValueRow label="Save Data Mode" value={networkData.saveData === null ? null : networkData.saveData ? 'Enabled' : 'Disabled'} />
          <ValueRow label="Status" value={networkData.online ? 'Online' : 'Offline'} />
        </SensorCard>

        <SensorCard title="Browser API Estimate" icon={<Zap className="h-4 w-4 text-cyan-400" />}>
          {/* Mini bar */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Estimated Downlink</span>
              <span className="text-xs font-mono font-semibold text-primary">
                {networkData.downlink !== null ? `${networkData.downlink} Mbps` : '—'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  networkData.downlink !== null
                    ? networkData.downlink < 1 ? 'bg-red-500'
                    : networkData.downlink < 5 ? 'bg-orange-500'
                    : networkData.downlink < 20 ? 'bg-yellow-500'
                    : 'bg-green-500'
                    : 'bg-muted'
                )}
                style={{ width: networkData.downlink !== null ? `${Math.min(100, (networkData.downlink / 100) * 100)}%` : '0%' }}
              />
            </div>
          </div>
          <ValueRow label="Downlink" value={networkData.downlink} unit=" Mbps" highlight />
          <ValueRow label="Round Trip Time" value={networkData.rtt} unit=" ms" />
          {effInfo && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">Speed Class</span>
              <span className={cn('text-xs font-semibold', effInfo.color)}>{effInfo.label}</span>
            </div>
          )}
          {!supported && (
            <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
              Network Information API not fully supported on this browser.
            </p>
          )}
        </SensorCard>
      </div>
    </div>
  );
}
