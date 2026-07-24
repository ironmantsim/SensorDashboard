import { useState, useEffect } from 'react';
import { DeviceInfo } from '@/types/sensors';

function detectOS(ua: string): string {
  if (/android/i.test(ua)) return 'Android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/windows phone/i.test(ua)) return 'Windows Phone';
  if (/win/i.test(ua)) return 'Windows';
  if (/mac/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/cros/i.test(ua)) return 'ChromeOS';
  return 'Unknown';
}

function detectBrowser(ua: string): { name: string; version: string } {
  if (/edg\//i.test(ua)) {
    const v = ua.match(/edg\/([\d.]+)/i)?.[1] ?? '';
    return { name: 'Edge', version: v };
  }
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) {
    const v = ua.match(/chrome\/([\d.]+)/i)?.[1] ?? '';
    return { name: 'Chrome', version: v };
  }
  if (/firefox/i.test(ua)) {
    const v = ua.match(/firefox\/([\d.]+)/i)?.[1] ?? '';
    return { name: 'Firefox', version: v };
  }
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    const v = ua.match(/version\/([\d.]+)/i)?.[1] ?? '';
    return { name: 'Safari', version: v };
  }
  if (/opr\//i.test(ua)) {
    const v = ua.match(/opr\/([\d.]+)/i)?.[1] ?? '';
    return { name: 'Opera', version: v };
  }
  return { name: 'Unknown', version: '' };
}

export function useDeviceInfo(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(() => {
    const ua = navigator.userAgent;
    const browser = detectBrowser(ua);
    return {
      os: detectOS(ua),
      browser: browser.name,
      browserVersion: browser.version,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: screen.colorDepth,
      touchPoints: navigator.maxTouchPoints,
      platform: (navigator as any).userAgentData?.platform ?? navigator.platform ?? 'Unknown',
      cookiesEnabled: navigator.cookieEnabled,
      hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
      deviceMemory: (navigator as any).deviceMemory ?? null,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      setInfo(prev => ({
        ...prev,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return info;
}
