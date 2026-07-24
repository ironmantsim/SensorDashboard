import { useState, useEffect, useRef, useCallback } from 'react';
import { MotionData, ChartDataPoint } from '@/types/sensors';

const MAX_CHART_POINTS = 50;

export function useMotionSensors() {
  const [motionData, setMotionData] = useState<MotionData>({
    accelerometer: { x: null, y: null, z: null },
    gyroscope: { x: null, y: null, z: null },
    orientation: { alpha: null, beta: null, gamma: null },
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [motionSupported, setMotionSupported] = useState(false);
  const [orientationSupported, setOrientationSupported] = useState(false);

  const chartDataRef = useRef<ChartDataPoint[]>([]);

  useEffect(() => {
    setMotionSupported('DeviceMotionEvent' in window);
    setOrientationSupported('DeviceOrientationEvent' in window);
  }, []);

  const addChartPoint = useCallback((accel: { x: number | null; y: number | null; z: number | null }, gyro: { x: number | null; y: number | null; z: number | null }) => {
    const now = new Date();
    const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${Math.floor(now.getMilliseconds() / 100)}`;
    
    const point: ChartDataPoint = {
      time: timeStr,
      accelX: accel.x ?? 0,
      accelY: accel.y ?? 0,
      accelZ: accel.z ?? 0,
      gyroX: gyro.x ?? 0,
      gyroY: gyro.y ?? 0,
      gyroZ: gyro.z ?? 0,
    };

    chartDataRef.current = [...chartDataRef.current.slice(-MAX_CHART_POINTS + 1), point];
    setChartData([...chartDataRef.current]);
  }, []);

  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity;
    const gyro = event.rotationRate;

    const newAccel = {
      x: accel?.x !== undefined && accel.x !== null ? parseFloat(accel.x.toFixed(3)) : null,
      y: accel?.y !== undefined && accel.y !== null ? parseFloat(accel.y.toFixed(3)) : null,
      z: accel?.z !== undefined && accel.z !== null ? parseFloat(accel.z.toFixed(3)) : null,
    };
    const newGyro = {
      x: gyro?.alpha !== undefined && gyro.alpha !== null ? parseFloat(gyro.alpha.toFixed(3)) : null,
      y: gyro?.beta !== undefined && gyro.beta !== null ? parseFloat(gyro.beta.toFixed(3)) : null,
      z: gyro?.gamma !== undefined && gyro.gamma !== null ? parseFloat(gyro.gamma.toFixed(3)) : null,
    };

    setMotionData(prev => ({
      ...prev,
      accelerometer: newAccel,
      gyroscope: newGyro,
    }));

    addChartPoint(newAccel, newGyro);
  }, [addChartPoint]);

  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
    setMotionData(prev => ({
      ...prev,
      orientation: {
        alpha: event.alpha !== null ? parseFloat(event.alpha.toFixed(2)) : null,
        beta: event.beta !== null ? parseFloat(event.beta.toFixed(2)) : null,
        gamma: event.gamma !== null ? parseFloat(event.gamma.toFixed(2)) : null,
      },
    }));
  }, []);

  const requestPermission = useCallback(async () => {
    // iOS 13+ requires permission
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const motionPerm = await (DeviceMotionEvent as any).requestPermission();
        const orientPerm = await (DeviceOrientationEvent as any).requestPermission();
        const granted = motionPerm === 'granted' && orientPerm === 'granted';
        setHasPermission(granted);
        if (granted) {
          window.addEventListener('devicemotion', handleDeviceMotion);
          window.addEventListener('deviceorientation', handleDeviceOrientation);
        }
        return granted;
      } catch {
        setHasPermission(false);
        return false;
      }
    } else {
      // Android / Desktop - no permission needed
      setHasPermission(true);
      window.addEventListener('devicemotion', handleDeviceMotion);
      window.addEventListener('deviceorientation', handleDeviceOrientation);
      return true;
    }
  }, [handleDeviceMotion, handleDeviceOrientation]);

  useEffect(() => {
    // Auto-start on non-iOS devices
    if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
      window.addEventListener('devicemotion', handleDeviceMotion);
      window.addEventListener('deviceorientation', handleDeviceOrientation);
      setHasPermission(true);
      return () => {
        window.removeEventListener('devicemotion', handleDeviceMotion);
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
      };
    }
    return () => {};
  }, [handleDeviceMotion, handleDeviceOrientation]);

  return {
    motionData,
    chartData,
    hasPermission,
    motionSupported,
    orientationSupported,
    requestPermission,
  };
}
