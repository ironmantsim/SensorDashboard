import { SensorCard, ValueRow } from '@/components/features/SensorCard';
import { useBattery } from '@/hooks/useBattery';
import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function BatteryVisual({ level, charging }: { level: number | null; charging: boolean | null }) {
  const pct = level ?? 0;
  const color = pct <= 15 ? 'bg-red-500' : pct <= 30 ? 'bg-orange-500' : pct <= 60 ? 'bg-yellow-500' : 'bg-green-500';
  const glow = pct <= 15 ? 'shadow-[0_0_10px_hsl(0_84%_60%/0.5)]' : '';

  return (
    <div className="flex flex-col items-center py-4">
      <div className={cn('relative w-24 h-12 rounded-lg border-2 border-current flex items-center p-1', 
        pct <= 15 ? 'text-red-500' : pct <= 60 ? 'text-yellow-500' : 'text-green-500', glow)}>
        {/* Battery terminal */}
        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-r bg-current opacity-60" />
        {/* Fill */}
        <div
          className={cn('h-full rounded transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
        {/* Percentage text */}
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow">
          {level !== null ? `${level}%` : '?'}
        </span>
      </div>
      {charging && (
        <div className="mt-2 flex items-center gap-1 text-green-500 text-xs font-medium">
          <BatteryCharging className="h-3.5 w-3.5" />
          Charging
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function BatterySection() {
  const battery = useBattery();

  const getIcon = () => {
    if (!battery.supported) return <Battery className="h-4 w-4 text-yellow-500" />;
    if (battery.charging) return <BatteryCharging className="h-4 w-4 text-green-500" />;
    const lvl = battery.level ?? 0;
    if (lvl <= 15) return <BatteryLow className="h-4 w-4 text-red-500" />;
    if (lvl <= 50) return <BatteryMedium className="h-4 w-4 text-yellow-500" />;
    return <BatteryFull className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-4">
      <h2 className="section-title flex items-center gap-2">
        <Battery className="h-5 w-5 text-yellow-500" /> Battery Information
      </h2>

      {!battery.supported ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Battery API is not supported in this browser.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SensorCard title="Battery Status" icon={getIcon()} live={battery.supported}>
            <BatteryVisual level={battery.level} charging={battery.charging} />
            <div
              className={cn(
                'h-1.5 rounded-full overflow-hidden bg-muted mb-3',
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  (battery.level ?? 0) <= 15 ? 'bg-red-500' :
                  (battery.level ?? 0) <= 30 ? 'bg-orange-500' :
                  (battery.level ?? 0) <= 60 ? 'bg-yellow-500' : 'bg-green-500'
                )}
                style={{ width: `${battery.level ?? 0}%` }}
              />
            </div>
            <ValueRow label="Level" value={battery.level} unit="%" highlight />
            <ValueRow label="State" value={battery.charging === null ? null : battery.charging ? 'Charging ⚡' : 'Discharging'} />
          </SensorCard>

          <SensorCard title="Time Estimates" icon={<Battery className="h-4 w-4 text-yellow-500" />}>
            <div className="space-y-4 py-2">
              <div className="text-center p-4 rounded-lg bg-muted/40">
                <div className="text-3xl font-bold font-mono text-primary">
                  {battery.charging ? formatTime(battery.chargingTime) : formatTime(battery.dischargingTime)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {battery.charging ? 'Until fully charged' : 'Until empty'}
                </div>
              </div>
              <ValueRow label="Charging time" value={formatTime(battery.chargingTime)} />
              <ValueRow label="Discharging time" value={formatTime(battery.dischargingTime)} />
            </div>
          </SensorCard>
        </div>
      )}
    </div>
  );
}
