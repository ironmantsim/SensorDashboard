import { SensorCard, ValueRow } from '@/components/features/SensorCard';
import { useAmbientLight } from '@/hooks/useAmbientLight';
import { useBarometer } from '@/hooks/useBarometer';
import { Thermometer, Sun, Wind, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function LightMeter({ value }: { value: number | null }) {
  const pct = value !== null ? Math.min(100, (value / 100000) * 100) : 0;
  const label = value !== null
    ? value < 1 ? 'Dark' : value < 50 ? 'Dim' : value < 500 ? 'Indoor' : value < 10000 ? 'Bright' : 'Sunlight'
    : '—';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Illuminance</span>
        <span className="text-xs font-mono font-semibold text-primary">
          {value !== null ? `${value.toFixed(1)} lux` : '—'}
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(to right, hsl(220 100% 60%), hsl(50 100% 60%), hsl(0 0% 100%))'
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Dark</span>
        <span className="font-medium text-foreground">{label}</span>
        <span>Sunlight</span>
      </div>
    </div>
  );
}

function PressureGauge({ value }: { value: number | null }) {
  const pct = value !== null ? Math.min(100, Math.max(0, ((value - 960) / 100) * 100)) : 50;
  const condition = value !== null
    ? value < 1000 ? 'Low Pressure' : value < 1020 ? 'Normal' : 'High Pressure'
    : '—';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Atmospheric Pressure</span>
        <span className="text-xs font-mono font-semibold text-primary">
          {value !== null ? `${value} hPa` : '—'}
        </span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            value !== null && value < 1000 ? 'bg-blue-500' : value !== null && value > 1020 ? 'bg-orange-500' : 'bg-primary'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>960</span>
        <span className="font-medium text-foreground">{condition}</span>
        <span>1060</span>
      </div>
    </div>
  );
}

function PermissionPrompt({ onRequest, loading }: { onRequest: () => void; loading?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <ShieldCheck className="h-5 w-5 text-primary" />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Permission required to access this sensor
      </p>
      <Button size="sm" onClick={onRequest} disabled={loading} className="text-xs h-8 w-full">
        {loading ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Requesting...</> : <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Grant Access</>}
      </Button>
    </div>
  );
}

export function EnvironmentSection() {
  const light = useAmbientLight();
  const baro = useBarometer();

  return (
    <div className="space-y-4">
      <h2 className="section-title flex items-center gap-2">
        <Thermometer className="h-5 w-5 text-orange-500" /> Environmental Sensors
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ambient Light */}
        <SensorCard
          title="Ambient Light"
          icon={<Sun className="h-4 w-4 text-yellow-500" />}
          live={light.supported && light.value !== null}
        >
          {!light.supported ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              AmbientLightSensor API not available in this browser
            </div>
          ) : light.hasPermission === false ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                {light.error ?? 'Permission denied'}
              </div>
              <Button size="sm" variant="outline" onClick={light.requestPermission} className="w-full text-xs h-8">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Retry Permission
              </Button>
            </div>
          ) : light.value === null && light.hasPermission === null ? (
            <PermissionPrompt onRequest={light.requestPermission} />
          ) : (
            <>
              <LightMeter value={light.value} />
              {light.value !== null && (
                <div className="mt-3 pt-2 border-t border-border/50">
                  <ValueRow label="Illuminance" value={light.value} unit=" lux" highlight />
                </div>
              )}
            </>
          )}
        </SensorCard>

        {/* Barometer */}
        <SensorCard
          title="Barometer"
          icon={<Wind className="h-4 w-4 text-blue-500" />}
          live={baro.supported && baro.pressure !== null}
        >
          {!baro.supported ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              Barometer API not available in this browser
            </div>
          ) : baro.hasPermission === false ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                {baro.error ?? 'Permission denied'}
              </div>
              <Button size="sm" variant="outline" onClick={baro.requestPermission} className="w-full text-xs h-8">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Retry Permission
              </Button>
            </div>
          ) : baro.pressure === null && baro.hasPermission === null ? (
            <PermissionPrompt onRequest={baro.requestPermission} />
          ) : (
            <>
              <PressureGauge value={baro.pressure} />
              {baro.pressure !== null && (
                <div className="mt-3 pt-2 border-t border-border/50">
                  <ValueRow label="Pressure" value={baro.pressure} unit=" hPa" highlight />
                  <ValueRow
                    label="Altitude (est.)"
                    value={Math.round(44330 * (1 - Math.pow(baro.pressure / 1013.25, 0.1903)))}
                    unit=" m"
                  />
                </div>
              )}
            </>
          )}
        </SensorCard>
      </div>

      <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Browser Support Note</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ambient Light and Barometer use the Generic Sensor API — available in Chrome on Android with
              the <code className="bg-muted px-1 rounded text-[10px]">#enable-generic-sensor-extra-classes</code> flag enabled.
              Most desktop and iOS browsers do not expose these sensors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
