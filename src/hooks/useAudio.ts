import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioData {
  level: number;
  waveform: number[];
  stream: MediaStream | null;
  hasPermission: boolean | null;
  error: string | null;
  isActive: boolean;
}

const WAVEFORM_SIZE = 64;

export function useAudio() {
  const [audioData, setAudioData] = useState<AudioData>({
    level: 0,
    waveform: new Array(WAVEFORM_SIZE).fill(0),
    stream: null,
    hasPermission: null,
    error: null,
    isActive: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startAnalysis = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = Math.min(100, Math.round(rms * 300));

      // Downsample for waveform
      const step = Math.floor(bufferLength / WAVEFORM_SIZE);
      const waveform = Array.from({ length: WAVEFORM_SIZE }, (_, i) => {
        return ((dataArray[i * step] - 128) / 128);
      });

      setAudioData(prev => ({ ...prev, level, waveform }));
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const requestMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      setAudioData(prev => ({
        ...prev,
        stream,
        hasPermission: true,
        error: null,
        isActive: true,
      }));

      startAnalysis();
    } catch (err: any) {
      setAudioData(prev => ({
        ...prev,
        hasPermission: false,
        error: err.message || 'Microphone access denied',
        isActive: false,
      }));
    }
  }, [startAnalysis]);

  const stopMicrophone = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioData(prev => ({
      ...prev,
      stream: null,
      isActive: false,
      level: 0,
      waveform: new Array(WAVEFORM_SIZE).fill(0),
    }));
  }, []);

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, [stopMicrophone]);

  return { audioData, requestMicrophone, stopMicrophone };
}
