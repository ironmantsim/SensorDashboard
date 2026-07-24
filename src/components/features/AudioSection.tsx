import { SensorCard } from '@/components/features/SensorCard';
import { useAudio } from '@/hooks/useAudio';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function SoundMeter({ level }: { level: number }) {
  const color = level < 30 ? 'bg-green-500' : level < 70 ? 'bg-yellow-500' : 'bg-red-500';
  const segments = 20;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Sound Level</span>
        <span className="text-xs font-mono font-semibold text-primary">{level}%</span>
      </div>
      <div className="flex gap-0.5 items-end h-8">
        {Array.from({ length: segments }, (_, i) => {
          const threshold = ((i + 1) / segments) * 100;
          const active = level >= threshold;
          const segColor = i < segments * 0.5 ? 'bg-green-500' : i < segments * 0.7 ? 'bg-yellow-500' : 'bg-red-500';
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-sm transition-all duration-75',
                active ? segColor : 'bg-muted'
              )}
              style={{ height: `${40 + (i / segments) * 60}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Waveform({ data }: { data: number[] }) {
  const width = 400;
  const height = 80;
  const midY = height / 2;
  const step = width / data.length;

  const path = data.map((v, i) => {
    const x = i * step;
    const y = midY + v * midY;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-hidden rounded-lg bg-muted/30 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
        <line x1="0" y1={midY} x2={width} y2={midY} stroke="hsl(var(--border))" strokeWidth="0.5" />
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function AudioSection() {
  const { audioData, requestMicrophone, stopMicrophone } = useAudio();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Mic className="h-5 w-5 text-pink-500" /> Audio Tools
        </h2>
        <div className="flex gap-2">
          {!audioData.isActive ? (
            <Button size="sm" onClick={requestMicrophone} className="text-xs h-7">
              <Mic className="h-3.5 w-3.5 mr-1" />
              Start Microphone
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={stopMicrophone} className="text-xs h-7">
              <MicOff className="h-3.5 w-3.5 mr-1" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {audioData.error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {audioData.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SensorCard
          title="Sound Level Meter"
          icon={<Volume2 className="h-4 w-4 text-pink-500" />}
          live={audioData.isActive}
        >
          {audioData.isActive ? (
            <SoundMeter level={audioData.level} />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <MicOff className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Enable microphone to view sound level</p>
            </div>
          )}
        </SensorCard>

        <SensorCard
          title="Audio Waveform"
          icon={<Mic className="h-4 w-4 text-pink-400" />}
          live={audioData.isActive}
        >
          {audioData.isActive ? (
            <Waveform data={audioData.waveform} />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Mic className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Enable microphone to view waveform</p>
            </div>
          )}
        </SensorCard>
      </div>

      <div className="p-3 rounded-lg bg-pink-500/5 border border-pink-500/20 text-xs text-muted-foreground">
        Microphone access is required for audio analysis. Audio data is processed locally and never transmitted.
      </div>
    </div>
  );
}
