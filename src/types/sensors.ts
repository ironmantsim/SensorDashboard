export interface MotionData {
  accelerometer: { x: number | null; y: number | null; z: number | null };
  gyroscope: { x: number | null; y: number | null; z: number | null };
  orientation: { alpha: number | null; beta: number | null; gamma: number | null };
}

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  speed: number | null;
  heading: number | null;
  error: string | null;
  loading: boolean;
}

export interface BatteryData {
  level: number | null;
  charging: boolean | null;
  chargingTime: number | null;
  dischargingTime: number | null;
  supported: boolean;
}

export interface NetworkData {
  type: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
  online: boolean;
}

export interface DeviceInfo {
  os: string;
  browser: string;
  browserVersion: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  language: string;
  timezone: string;
  colorDepth: number;
  touchPoints: number;
  platform: string;
  cookiesEnabled: boolean;
  hardwareConcurrency: number;
  deviceMemory: number | null;
}

export type SensorStatus = 'supported' | 'unsupported' | 'permission_required' | 'active' | 'error';

export interface SensorInfo {
  name: string;
  status: SensorStatus;
  description: string;
}

export interface ChartDataPoint {
  time: string;
  accelX?: number;
  accelY?: number;
  accelZ?: number;
  gyroX?: number;
  gyroY?: number;
  gyroZ?: number;
}

export type NavSection =
  | 'dashboard'
  | 'motion'
  | 'location'
  | 'environment'
  | 'battery'
  | 'audio'
  | 'camera'
  | 'network'
  | 'device'
  | 'permissions'
  | 'status'
  | 'visualization'
  | 'recording';
