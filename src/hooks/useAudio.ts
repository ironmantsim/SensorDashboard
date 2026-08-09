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

  // ── Audio recording state ──
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [audioRecordingMs, setAudioRecordingMs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef<number>(0);
  const isAudioRecordingRef = useRef(false);

  const startAnalysis = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);

      // RMS level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = Math.min(100, Math.round(rms * 300));

      // Waveform downsample
      const step = Math.floor(bufferLength / WAVEFORM_SIZE);
      const waveform = Array.from({ length: WAVEFORM_SIZE }, (_, i) => {
        return (dataArray[i * step] - 128) / 128;
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
    if (isAudioRecordingRef.current && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    isAudioRecordingRef.current = false;
    setIsAudioRecording(false);
    setAudioData(prev => ({
      ...prev,
      stream: null,
      isActive: false,
      level: 0,
      waveform: new Array(WAVEFORM_SIZE).fill(0),
    }));
  }, []);

  // ── Audio recording ──────────────────────────────────────────────────────
  const startAudioRecording = useCallback(() => {
    if (!streamRef.current || isAudioRecordingRef.current) return;

    const mimeType =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

    const options = mimeType ? { mimeType } : {};
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current, options);
    } catch {
      recorder = new MediaRecorder(streamRef.current);
    }

    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    setAudioBlob(null);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || mimeType || 'audio/webm',
      });
      setAudioBlob(blob);
      isAudioRecordingRef.current = false;
      setIsAudioRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };

    recorder.start(250);
    recordingStartRef.current = Date.now();
    setAudioRecordingMs(0);
    isAudioRecordingRef.current = true;
    setIsAudioRecording(true);

    recordingIntervalRef.current = setInterval(() => {
      setAudioRecordingMs(Date.now() - recordingStartRef.current);
    }, 500);
  }, []);

  const stopAudioRecording = useCallback(() => {
    if (!isAudioRecordingRef.current || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const downloadAudio = useCallback((blob?: Blob | null) => {
    const target = blob ?? audioBlob;
    if (!target) return;
    const ext = target.type.includes('mp4') ? 'mp4' : 'webm';
    const url = URL.createObjectURL(target);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [audioBlob]);

  const clearAudio = useCallback(() => {
    setAudioBlob(null);
    setAudioRecordingMs(0);
  }, []);

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, []);

  return {
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
  };
}
