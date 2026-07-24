import { SensorCard, ValueRow } from '@/components/features/SensorCard';
import { useMotionSensors } from '@/hooks/useMotionSensors';
import { Cpu, RotateCcw, Compass, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function AxisBar({ value, max = 20 }: { value: number | null; max?: number }) {
  const pct = value !== null ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  const isPos = (value ?? 0) >= 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-100', isPos ? 'bg-primary' : 'bg-rose-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MotionSection() {
  const { motionData, hasPermission, motionSupported, orientationSupported, requestPermission } = useMotionSensors();

  const needsPermission = typeof (DeviceMotionEvent as any).requestPermission === 'function';
  const showPermBtn = needsPermission && hasPermission !== true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Cpu className="h-5 w-5 text-violet-500" /> Motion Sensors
        </h2>
        {showPermBtn && (
          <Button size="sm" onClick={requestPermission} className="text-xs h-7">
            Request Permission
          </Button>
        )}
      </div>

      {!motionSupported && !orientationSupported && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Motion sensors are not supported in this browser.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Accelerometer */}
        <SensorCard
          title="Accelerometer"
          icon={<Cpu className="h-4 w-4 text-violet-500" />}
          live={motionSupported && hasPermission === true}
        >
          <div className="space-y-2">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground uppercase font-medium">{axis}-axis</span>
                  <span className="text-xs font-mono font-semibold text-primary">
                    {motionData.accelerometer[axis] !== null ? `${motionData.accelerometer[axis]} m/s²` : '—'}
                  </span>
                </div>
                <AxisBar value={motionData.accelerometer[axis]} max={20} />
              </div>
            ))}
          </div>
        </SensorCard>

        {/* Gyroscope */}
        <SensorCard
          title="Gyroscope"
          icon={<RotateCcw className="h-4 w-4 text-violet-400" />}
          live={motionSupported && hasPermission === true}
        >
          <div className="space-y-2">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground uppercase font-medium">{axis}-axis</span>
                  <span className="text-xs font-mono font-semibold text-primary">
                    {motionData.gyroscope[axis] !== null ? `${motionData.gyroscope[axis]} °/s` : '—'}
                  </span>
                </div>
                <AxisBar value={motionData.gyroscope[axis]} max={360} />
              </div>
            ))}
          </div>
        </SensorCard>

        {/* Orientation */}
        <SensorCard
          title="Device Orientation"
          icon={<Compass className="h-4 w-4 text-indigo-500" />}
          live={orientationSupported && hasPermission !== false}
        >
          {/* Visual compass */}
          <div className="flex justify-center mb-3">
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 rounded-full border-2 border-primary/30 flex items-center justify-center">
                <div
                  className="w-1 h-8 bg-primary rounded-full absolute top-2 origin-bottom transition-transform duration-200"
                  style={{
                    transform: `rotate(${motionData.orientation.alpha ?? 0}deg)`,
                    transformOrigin: 'bottom center',
                    bottom: '50%',
                    left: '50%',
                    marginLeft: '-2px',
                  }}
                />
                <div className="w-3 h-3 rounded-full bg-primary z-10" />
              </div>
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-[9px] text-muted-foreground">N</span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-[9px] text-muted-foreground">S</span>
              <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 text-[9px] text-muted-foreground">W</span>
              <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 text-[9px] text-muted-foreground">E</span>
            </div>
          </div>
          <ValueRow label="Alpha (Z-axis)" value={motionData.orientation.alpha} unit="°" highlight />
          <ValueRow label="Beta (X-axis)" value={motionData.orientation.beta} unit="°" highlight />
          <ValueRow label="Gamma (Y-axis)" value={motionData.orientation.gamma} unit="°" highlight />
        </SensorCard>
      </div>

      {/* Motion activity indicator */}
      <SensorCard title="Motion Activity" icon={<Cpu className="h-4 w-4 text-violet-500" />}>
        <div className="flex items-center gap-4">
          {(['x', 'y', 'z'] as const).map((axis) => {
            const val = Math.abs(motionData.accelerometer[axis] ?? 0);
            const active = val > 0.5;
            return (
              <div key={axis} className="flex-1 text-center">
                <div className={cn(
                  'w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
                  active
                    ? 'bg-primary/20 border-2 border-primary text-primary shadow-[0_0_10px_hsl(var(--primary)/0.4)]'
                    : 'bg-muted border-2 border-border text-muted-foreground'
                )}>
                  {axis.toUpperCase()}
                </div>
                <div className={cn('text-[10px] mt-1 font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                  {active ? 'MOVING' : 'STILL'}
                </div>
              </div>
            );
          })}
        </div>
      </SensorCard>
    </div>
  );
}
