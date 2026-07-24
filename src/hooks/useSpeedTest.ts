import { useState, useRef, useCallback } from 'react';

export type SpeedTestStatus = 'idle' | 'downloading' | 'uploading' | 'done' | 'error';

export interface SpeedTestResult {
  downloadMbps: number | null;
  uploadMbps: number | null;
  pingMs: number | null;
  jitterMs: number | null;
  status: SpeedTestStatus;
  progress: number; // 0–100
  error: string | null;
}

// Public CORS-friendly files for download measurement
const DOWNLOAD_URLS = [
  `https://speed.cloudflare.com/__down?bytes=5000000&_=${Date.now()}`,
  `https://httpbin.org/bytes/2000000`,
];

const PING_URL = 'https://speed.cloudflare.com/__down?bytes=1';

async function measurePing(): Promise<{ ping: number; jitter: number }> {
  const samples: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    try {
      await fetch(`${PING_URL}&_=${Date.now() + i}`, { method: 'HEAD', cache: 'no-store' });
    } catch {
      await fetch(PING_URL, { method: 'GET', cache: 'no-store' });
    }
    samples.push(performance.now() - t0);
    await sleep(80);
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const jitter =
    samples.reduce((acc, v) => acc + Math.abs(v - avg), 0) / samples.length;
  return { ping: Math.round(avg), jitter: Math.round(jitter) };
}

async function measureDownload(
  onProgress: (mbps: number, pct: number) => void,
  signal: AbortSignal
): Promise<number> {
  const BYTES = 10_000_000; // 10 MB target
  const url = `https://speed.cloudflare.com/__down?bytes=${BYTES}&_=${Date.now()}`;

  const t0 = performance.now();
  let loaded = 0;

  try {
    const res = await fetch(url, { cache: 'no-store', signal });
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No body reader');

    while (true) {
      const { done, value } = await reader.read();
      if (done || signal.aborted) break;
      loaded += value?.byteLength ?? 0;
      const elapsed = (performance.now() - t0) / 1000;
      const mbps = (loaded * 8) / 1_000_000 / elapsed;
      const pct = Math.min(100, (loaded / BYTES) * 100);
      onProgress(parseFloat(mbps.toFixed(2)), pct);
    }
  } catch (e: any) {
    if (e.name === 'AbortError') return 0;
    // Fallback: timed fetch without streaming
    const t1 = performance.now();
    try {
      const r2 = await fetch(`https://httpbin.org/bytes/2000000?_=${Date.now()}`, {
        cache: 'no-store',
        signal,
      });
      await r2.arrayBuffer();
      const elapsed = (performance.now() - t1) / 1000;
      const mbps = (2_000_000 * 8) / 1_000_000 / elapsed;
      onProgress(parseFloat(mbps.toFixed(2)), 100);
      return parseFloat(mbps.toFixed(2));
    } catch {
      return 0;
    }
  }

  const elapsed = (performance.now() - t0) / 1000;
  const finalMbps = (loaded * 8) / 1_000_000 / elapsed;
  return parseFloat(finalMbps.toFixed(2));
}

async function measureUpload(
  onProgress: (mbps: number, pct: number) => void,
  signal: AbortSignal
): Promise<number> {
  // Generate a random payload to upload
  const SIZE = 2_000_000; // 2 MB
  const payload = new Uint8Array(SIZE);
  crypto.getRandomValues(payload.slice(0, Math.min(SIZE, 65536))); // only fill first 64KB for speed

  const t0 = performance.now();
  try {
    await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: payload,
      cache: 'no-store',
      signal,
    });
    const elapsed = (performance.now() - t0) / 1000;
    const mbps = (SIZE * 8) / 1_000_000 / elapsed;
    for (let i = 0; i <= 100; i += 20) onProgress(parseFloat(mbps.toFixed(2)), i);
    return parseFloat(mbps.toFixed(2));
  } catch (e: any) {
    if (e.name === 'AbortError') return 0;
    return 0;
  }
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

export function useSpeedTest() {
  const [result, setResult] = useState<SpeedTestResult>({
    downloadMbps: null,
    uploadMbps: null,
    pingMs: null,
    jitterMs: null,
    status: 'idle',
    progress: 0,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const [liveMbps, setLiveMbps] = useState<number | null>(null);

  const start = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLiveMbps(null);
    setResult({
      downloadMbps: null,
      uploadMbps: null,
      pingMs: null,
      jitterMs: null,
      status: 'downloading',
      progress: 0,
      error: null,
    });

    try {
      // 1. Ping
      const { ping, jitter } = await measurePing();
      setResult(prev => ({ ...prev, pingMs: ping, jitterMs: jitter }));

      // 2. Download
      let finalDownload = 0;
      finalDownload = await measureDownload((mbps, pct) => {
        setLiveMbps(mbps);
        setResult(prev => ({ ...prev, progress: pct * 0.7 })); // download = 0-70%
      }, ctrl.signal);

      if (ctrl.signal.aborted) return;
      setResult(prev => ({
        ...prev,
        downloadMbps: finalDownload,
        status: 'uploading',
        progress: 70,
      }));
      setLiveMbps(null);

      // 3. Upload
      let finalUpload = 0;
      finalUpload = await measureUpload((mbps, pct) => {
        setLiveMbps(mbps);
        setResult(prev => ({ ...prev, progress: 70 + pct * 0.3 })); // upload = 70-100%
      }, ctrl.signal);

      if (ctrl.signal.aborted) return;

      setLiveMbps(null);
      setResult(prev => ({
        ...prev,
        uploadMbps: finalUpload,
        status: 'done',
        progress: 100,
      }));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setResult(prev => ({
        ...prev,
        status: 'error',
        error: err.message ?? 'Speed test failed',
      }));
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setResult(prev => ({ ...prev, status: 'idle', progress: 0 }));
    setLiveMbps(null);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResult({
      downloadMbps: null,
      uploadMbps: null,
      pingMs: null,
      jitterMs: null,
      status: 'idle',
      progress: 0,
      error: null,
    });
    setLiveMbps(null);
  }, []);

  return { result, liveMbps, start, stop, reset };
}
