import { useState, useCallback } from 'react';
import { RecordingRow } from '@/hooks/useRecording';

export interface LocalRecording {
  id: string;
  title: string;
  rows: RecordingRow[];
  sampleCount: number;
  durationMs: number;
  activeGroups: string[];
  createdAt: string;
  sharedToGroup: boolean;
  cloudId?: string;  // set when shared to group
}

const STORAGE_KEY = 'sensor_dash_recordings';
const MAX_RECORDINGS = 50;

function loadFromStorage(): LocalRecording[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(recs: LocalRecording[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recs));
  } catch {
    // storage quota exceeded — trim oldest
    const trimmed = recs.slice(-20);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch {}
  }
}

export function useLocalRecordings() {
  const [recordings, setRecordings] = useState<LocalRecording[]>(loadFromStorage);

  const saveRecording = useCallback((
    rows: RecordingRow[],
    durationMs: number,
    activeGroups: string[],
    title?: string,
  ): LocalRecording => {
    const rec: LocalRecording = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title || `Recording ${new Date().toLocaleString()}`,
      rows,
      sampleCount: rows.length,
      durationMs,
      activeGroups,
      createdAt: new Date().toISOString(),
      sharedToGroup: false,
    };
    setRecordings(prev => {
      const updated = [rec, ...prev].slice(0, MAX_RECORDINGS);
      saveToStorage(updated);
      return updated;
    });
    return rec;
  }, []);

  const renameRecording = useCallback((id: string, title: string) => {
    setRecordings(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, title } : r);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const deleteRecording = useCallback((id: string) => {
    setRecordings(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const markShared = useCallback((id: string, cloudId: string) => {
    setRecordings(prev => {
      const updated = prev.map(r =>
        r.id === id ? { ...r, sharedToGroup: true, cloudId } : r
      );
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const markUnshared = useCallback((id: string) => {
    setRecordings(prev => {
      const updated = prev.map(r =>
        r.id === id ? { ...r, sharedToGroup: false, cloudId: undefined } : r
      );
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRecordings([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    recordings,
    saveRecording,
    renameRecording,
    deleteRecording,
    markShared,
    markUnshared,
    clearAll,
  };
}
