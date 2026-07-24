import { useState } from 'react';
import { SensorCard } from '@/components/features/SensorCard';
import { useMotionSensors } from '@/hooks/useMotionSensors';
import { BarChart2, Download, FileJson, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type ChartType = 'accelerometer' | 'gyroscope';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-semibold" style={{ color: entry.color }}>
            {typeof entry.value === 'number' ? entry.value.toFixed(3) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function VisualizationSection() {
  const { chartData, motionData } = useMotionSensors();
  const [chartType, setChartType] = useState<ChartType>('accelerometer');

  const exportCSV = () => {
    if (!chartData.length) return;
    const headers = ['time', 'accelX', 'accelY', 'accelZ', 'gyroX', 'gyroY', 'gyroZ'];
    const rows = chartData.map(d => headers.map(h => (d as any)[h] ?? '').join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!chartData.length) return;
    const json = JSON.stringify({ timestamp: new Date().toISOString(), data: chartData }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const accelLines = [
    { key: 'accelX', name: 'X-Axis', color: 'hsl(192 100% 50%)' },
    { key: 'accelY', name: 'Y-Axis', color: 'hsl(280 80% 65%)' },
    { key: 'accelZ', name: 'Z-Axis', color: 'hsl(38 90% 55%)' },
  ];

  const gyroLines = [
    { key: 'gyroX', name: 'Alpha', color: 'hsl(142 60% 50%)' },
    { key: 'gyroY', name: 'Beta', color: 'hsl(0 70% 60%)' },
    { key: 'gyroZ', name: 'Gamma', color: 'hsl(200 80% 55%)' },
  ];

  const lines = chartType === 'accelerometer' ? accelLines : gyroLines;
  const displayData = chartData.slice(-30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="section-title flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-rose-500" /> Data Visualization
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={!chartData.length} className="text-xs h-7">
            <FileText className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportJSON} disabled={!chartData.length} className="text-xs h-7">
            <FileJson className="h-3.5 w-3.5 mr-1" />
            JSON
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">Real-time Motion Charts</p>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(['accelerometer', 'gyroscope'] as ChartType[]).map(type => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                  chartType === type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {displayData.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 bg-muted/20 rounded-lg border border-dashed border-border/50">
            <BarChart2 className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Move your device to generate motion data</p>
            <p className="text-xs text-muted-foreground">Data will appear here in real-time</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={displayData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
              />
              {lines.map(line => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Current snapshot */}
      <SensorCard title="Current Readings Snapshot" icon={<Download className="h-4 w-4 text-rose-500" />}>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="label-text mb-1.5">Accelerometer (m/s²)</p>
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis} className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground uppercase">{axis}</span>
                <span className="font-mono text-primary">{motionData.accelerometer[axis] ?? '—'}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="label-text mb-1.5">Gyroscope (°/s)</p>
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis} className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground uppercase">{axis}</span>
                <span className="font-mono text-primary">{motionData.gyroscope[axis] ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          {chartData.length} data points collected. Export to CSV or JSON for external analysis.
        </p>
      </SensorCard>
    </div>
  );
}
