import { SensorCard } from '@/components/features/SensorCard';
import { useAudio } from '@/hooks/useAudio';
import { Mic, MicOff, Volume2, AlertCircle, Circle, Square, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── Sound Meter ──────────────────────────────────────────────────────────────
function SoundMeter({ level }: { level: number }) {
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
          const segColor =
            i < segments * 0.5
              ? 'bg-green-500'
              : i < segments * 0.7
              ? 'bg-yellow-500'
              : 'bg-red-500';
          return (
            <div
              key={i}
              className={cn('flex-1 rounded-sm transition-all duration-75', active ? segColor : 'bg-muted')}
              style={{ height: `${40 + (i / segments) * 60}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ data }: { data: number[] }) {
  const width = 400;
  const height = 80;
  const midY = height / 2;
  const step = width / data.length;

  const path = data
    .map((v, i) => {
      const x = i * step;
      const y = midY + v * midY;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="w-full overflow-hidden rounded-lg bg-muted/30 p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-16"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1={midY}
          x2={width}
          y2={midY}
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
        />
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

// ── Main Component ────────────────────────────────────────────────────────────
export function AudioSection() {
  const {
    audioData,
    isAudioRecording,
    audioRecordingMs,
    audioBlob,
    requestMicrophone,
    stopMicrophone,
    startAudioRecording,
    stopAudioRecording,
    downloadAudio,
    clearAudio,
  } = useAudio();

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Error */}
      {audioData.error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {audioData.error}
        </div>
      )}

      {/* Visualisation */}
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

      {/* Audio Recording */}
      <SensorCard
        title="Audio Recording"
        icon={<Circle className={cn('h-4 w-4', isAudioRecording ? 'text-red-500 animate-pulse' : 'text-pink-400')} />}
        live={isAudioRecording}
      >
        {audioData.isActive ? (
          <div className="space-y-3">
            {/* Controls row */}
            <div className="flex items-center gap-4">
              {/* Status circle */}
              <div
                className={cn(
                  'w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  isAudioRecording
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-border bg-muted/30',
                )}
              >
                {isAudioRecording ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Timer */}
              <div>
                <div
                  className={cn(
                    'text-2xl font-mono font-bold tabular-nums',
                    isAudioRecording ? 'text-red-500' : 'text-foreground',
                  )}
                >
                  {formatTime(audioRecordingMs)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isAudioRecording
                    ? 'Recording audio…'
                    : audioBlob
                    ? `Ready · ${(audioBlob.size / 1024).toFixed(1)} KB`
                    : 'Ready to record'}
                </div>
              </div>

              <div className="flex-1" />

              {/* Record / Stop */}
              {!isAudioRecording ? (
                <Button
                  size="sm"
                  onClick={startAudioRecording}
                  className="bg-red-500 hover:bg-red-600 text-white gap-1.5 flex-shrink-0"
                >
                  <Circle className="h-3.5 w-3.5 fill-white" />
                  Record
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={stopAudioRecording}
                  className="border-red-500/40 text-red-500 hover:bg-red-500/10 gap-1.5 flex-shrink-0"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop
                </Button>
              )}
            </div>

            {/* Live waveform while recording */}
            {isAudioRecording && (
              <div className="space-y-2">
                <Waveform data={audioData.waveform} />
                <SoundMeter level={audioData.level} />
              </div>
            )}

            {/* Download */}
            {audioBlob && !isAudioRecording && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => downloadAudio()}
                  className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary">
                      Download Recording
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(audioBlob.size / 1024).toFixed(1)} KB · {formatTime(audioRecordingMs)} duration
                    </div>
                  </div>
                </button>
                <button
                  onClick={clearAudio}
                  className="px-4 py-2 text-xs text-muted-foreground hover:text-red-500 border border-border/40 hover:border-red-500/30 rounded-xl transition-colors"
                >
                  Discard
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Circle className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Enable microphone first to record audio</p>
            <Button size="sm" variant="outline" onClick={requestMicrophone} className="gap-1.5 mt-1">
              <Mic className="h-3.5 w-3.5" /> Enable Microphone
            </Button>
          </div>
        )}
      </SensorCard>

      {/* Info */}
      <div className="p-3 rounded-lg bg-pink-500/5 border border-pink-500/20 text-xs text-muted-foreground">
        Microphone access is required for audio analysis and recording. All audio is processed and stored locally — nothing is transmitted.
      </div>
    </div>
  );
}
