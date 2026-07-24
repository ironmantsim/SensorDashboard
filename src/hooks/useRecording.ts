import { useState, useRef, useCallback } from 'react';

export interface RecordingRow {
  timestamp: string;
  elapsed_ms: number;
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  gyro_x: number | null;
  gyro_y: number | null;
  gyro_z: number | null;
  orientation_alpha: number | null;
  orientation_beta: number | null;
  orientation_gamma: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  gps_speed: number | null;
  compass_heading: number | null;
  battery_level: number | null;
  battery_charging: boolean | null;
  pressure_hpa: number | null;
  light_lux: number | null;
  network_type: string | null;
  network_effective: string | null;
}

export interface RecordingState {
  isRecording: boolean;
  rows: RecordingRow[];
  startTime: number | null;
  elapsed: number;
}

export function useRecording() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    rows: [],
    startTime: null,
    elapsed: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const dataGetterRef = useRef<(() => Omit<RecordingRow, 'timestamp' | 'elapsed_ms'>) | null>(null);

  const registerDataGetter = useCallback((fn: () => Omit<RecordingRow, 'timestamp' | 'elapsed_ms'>) => {
    dataGetterRef.current = fn;
  }, []);

  const startRecording = useCallback(() => {
    const now = Date.now();
    startTimeRef.current = now;
    setState(prev => ({ ...prev, isRecording: true, startTime: now, rows: [], elapsed: 0 }));

    // Elapsed timer
    intervalRef.current = setInterval(() => {
      setState(prev => ({ ...prev, elapsed: Date.now() - startTimeRef.current }));
    }, 500);

    // Sample every 500ms
    sampleIntervalRef.current = setInterval(() => {
      if (!dataGetterRef.current) return;
      const data = dataGetterRef.current();
      const now = Date.now();
      const row: RecordingRow = {
        timestamp: new Date(now).toISOString(),
        elapsed_ms: now - startTimeRef.current,
        ...data,
      };
      setState(prev => ({ ...prev, rows: [...prev.rows, row] }));
    }, 500);
  }, []);

  const stopRecording = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sampleIntervalRef.current) clearInterval(sampleIntervalRef.current);
    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  const clearRecording = useCallback(() => {
    setState(prev => ({ ...prev, rows: [], elapsed: 0, startTime: null }));
  }, []);

  const downloadCSV = useCallback((rows: RecordingRow[]) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]) as (keyof RecordingRow)[];
    const csv = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const v = row[h];
          if (v === null) return '';
          if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
          return String(v);
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadJSON = useCallback((rows: RecordingRow[]) => {
    if (rows.length === 0) return;
    const blob = new Blob([JSON.stringify({ recorded_at: new Date().toISOString(), samples: rows }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    ...state,
    registerDataGetter,
    startRecording,
    stopRecording,
    clearRecording,
    downloadCSV,
    downloadJSON,
  };
}
