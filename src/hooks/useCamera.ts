import { useState, useRef, useCallback } from 'react';

export type CameraFacing = 'user' | 'environment';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startCamera = useCallback(async (facingMode: CameraFacing = facing) => {
    // Stop existing stream
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      setStream(newStream);
      setFacing(facingMode);
      setHasPermission(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      setHasPermission(false);
      setError(err.message || 'Camera access denied');
    }
  }, [stream, facing]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  const switchCamera = useCallback(() => {
    const newFacing: CameraFacing = facing === 'user' ? 'environment' : 'user';
    startCamera(newFacing);
  }, [facing, startCamera]);

  const captureImage = useCallback(() => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      return dataUrl;
    }
    return null;
  }, []);

  const clearCapture = useCallback(() => setCapturedImage(null), []);

  return {
    stream,
    hasPermission,
    error,
    facing,
    capturedImage,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    switchCamera,
    captureImage,
    clearCapture,
  };
}
