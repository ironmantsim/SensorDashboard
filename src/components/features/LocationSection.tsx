import { SensorCard, ValueRow } from '@/components/features/SensorCard';
import { useLocation } from '@/hooks/useLocation';
import { useMagnetometer } from '@/hooks/useMagnetometer';
import { MapPin, Navigation, AlertCircle, Loader2, Compass, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function CompassRose({ heading }: { heading: number | null }) {
  return (
    <div className="flex flex-col items-center py-3 gap-2">
      <div className="relative w-24 h-24">
        {/* Rose ring */}
        <div className="absolute inset-0 rounded-full border-2 border-border/60" />
        {/* Cardinal labels */}
        {[
          { label: 'N', deg: 0 },
          { label: 'E', deg: 90 },
          { label: 'S', deg: 180 },
          { label: 'W', deg: 270 },
        ].map(({ label, deg }) => {
          const rad = (deg * Math.PI) / 180;
          const r = 38;
          const x = 48 + r * Math.sin(rad);
          const y = 48 - r * Math.cos(rad);
          return (
            <span
              key={label}
              className={cn(
                'absolute text-[10px] font-bold -translate-x-1/2 -translate-y-1/2',
                label === 'N' ? 'text-red-500' : 'text-muted-foreground'
              )}
              style={{ left: x, top: y }}
            >
              {label}
            </span>
          );
        })}
        {/* Needle */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
          style={{ transform: `rotate(${heading ?? 0}deg)` }}
        >
          <div className="flex flex-col items-center gap-0">
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[28px] border-l-transparent border-r-transparent border-b-red-500" />
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[28px] border-l-transparent border-r-transparent border-t-muted-foreground/60" />
          </div>
        </div>
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-card border-2 border-primary" />
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold font-mono text-primary">
          {heading !== null ? `${heading}°` : '—'}
        </div>
        <div className="text-xs text-muted-foreground">magnetic heading</div>
      </div>
    </div>
  );
}

export function LocationSection() {
  const { locationData, supported, isWatching, requestLocation, stopWatching } = useLocation();
  const compass = useMagnetometer();

  const mapUrl = locationData.latitude && locationData.longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${locationData.longitude - 0.01},${locationData.latitude - 0.01},${locationData.longitude + 0.01},${locationData.latitude + 0.01}&layer=mapnik&marker=${locationData.latitude},${locationData.longitude}`
    : null;

  const headingDir = (h: number | null) => {
    if (h === null) return null;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(h / 45) % 8];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-500" /> Location & Navigation
        </h2>
        <div className="flex gap-2">
          {!isWatching ? (
            <Button size="sm" onClick={requestLocation} disabled={!supported || locationData.loading} className="text-xs h-7">
              {locationData.loading ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Getting...</> : 'Start GPS'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={stopWatching} className="text-xs h-7">Stop</Button>
          )}
        </div>
      </div>

      {!supported && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Geolocation is not supported in this browser.
        </div>
      )}

      {locationData.error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {locationData.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SensorCard title="GPS Coordinates" icon={<MapPin className="h-4 w-4 text-emerald-500" />} live={isWatching}>
          <ValueRow label="Latitude" value={locationData.latitude?.toFixed(6)} unit="°" highlight />
          <ValueRow label="Longitude" value={locationData.longitude?.toFixed(6)} unit="°" highlight />
          <ValueRow label="Accuracy" value={locationData.accuracy} unit=" m" />
          <ValueRow label="Altitude" value={locationData.altitude} unit=" m" />
          <ValueRow label="Alt. Accuracy" value={locationData.altitudeAccuracy} unit=" m" />
        </SensorCard>

        <SensorCard title="Navigation Data" icon={<Navigation className="h-4 w-4 text-emerald-400" />} live={isWatching}>
          <ValueRow label="Speed" value={locationData.speed !== null ? (locationData.speed * 3.6).toFixed(1) : null} unit=" km/h" highlight />
          <ValueRow label="GPS Heading" value={locationData.heading} unit="°" />
          <ValueRow label="GPS Direction" value={headingDir(locationData.heading)} />
          <ValueRow label="Status" value={isWatching ? 'Watching' : 'Idle'} />
        </SensorCard>
      </div>

      {/* Compass / Magnetometer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SensorCard
          title="Compass / Magnetometer"
          icon={<Compass className="h-4 w-4 text-sky-500" />}
          live={compass.supported && compass.heading !== null}
        >
          {!compass.supported ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              No compass/magnetometer API available
            </div>
          ) : compass.hasPermission === false ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />{compass.error ?? 'Permission denied'}
              </div>
              <Button size="sm" variant="outline" onClick={compass.requestPermission} className="w-full text-xs h-8">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Retry Permission
              </Button>
            </div>
          ) : compass.heading === null ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Compass className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground text-center">
                {compass.hasPermission === null
                  ? 'Permission required to access compass'
                  : 'Move your device to get compass readings'}
              </p>
              {compass.hasPermission === null && (
                <Button size="sm" onClick={compass.requestPermission} className="text-xs h-8 w-full">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Grant Compass Access
                </Button>
              )}
            </div>
          ) : (
            <CompassRose heading={compass.heading} />
          )}
        </SensorCard>

        <SensorCard title="Magnetometer Readings" icon={<Compass className="h-4 w-4 text-sky-400" />} live={compass.heading !== null}>
          <ValueRow label="Heading" value={compass.heading} unit="°" highlight />
          <ValueRow label="Direction" value={compass.direction} />
          {compass.source === 'Magnetometer' && (
            <>
              <ValueRow label="X-axis" value={compass.x} unit=" µT" />
              <ValueRow label="Y-axis" value={compass.y} unit=" µT" />
              <ValueRow label="Z-axis" value={compass.z} unit=" µT" />
            </>
          )}
          <ValueRow label="Source" value={compass.source} />
          {compass.heading === null && compass.hasPermission === null && (
            <Button size="sm" onClick={compass.requestPermission} className="w-full text-xs h-8 mt-2">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Request Access
            </Button>
          )}
        </SensorCard>
      </div>

      {/* Map */}
      <SensorCard title="Live Map" icon={<MapPin className="h-4 w-4 text-emerald-500" />}>
        {mapUrl ? (
          <div className="rounded-lg overflow-hidden border border-border/50 h-64">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              title="Location Map"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border/50 gap-3">
            <MapPin className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Enable GPS to see your location on the map</p>
            {!isWatching && supported && (
              <Button size="sm" onClick={requestLocation} className="text-xs h-7">
                Enable GPS
              </Button>
            )}
          </div>
        )}
      </SensorCard>
    </div>
  );
}
