import { SensorCard, ValueRow } from '@/components/features/SensorCard';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';
import { Monitor, Globe, Cpu, Smartphone } from 'lucide-react';

export function DeviceSection() {
  const info = useDeviceInfo();

  return (
    <div className="space-y-4">
      <h2 className="section-title flex items-center gap-2">
        <Monitor className="h-5 w-5 text-indigo-500" /> Device Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SensorCard title="System" icon={<Smartphone className="h-4 w-4 text-indigo-500" />}>
          <ValueRow label="Operating System" value={info.os} highlight />
          <ValueRow label="Platform" value={info.platform} />
          <ValueRow label="Browser" value={`${info.browser} ${info.browserVersion}`} />
          <ValueRow label="Language" value={info.language} />
          <ValueRow label="Timezone" value={info.timezone} />
        </SensorCard>

        <SensorCard title="Display" icon={<Monitor className="h-4 w-4 text-indigo-400" />}>
          <ValueRow label="Screen Resolution" value={`${info.screenWidth} × ${info.screenHeight}`} highlight />
          <ValueRow label="Viewport Size" value={`${info.viewportWidth} × ${info.viewportHeight}`} />
          <ValueRow label="Pixel Ratio" value={`${info.pixelRatio}x`} />
          <ValueRow label="Color Depth" value={`${info.colorDepth}-bit`} />
          <ValueRow label="Touch Points" value={info.touchPoints} />
        </SensorCard>

        <SensorCard title="Hardware" icon={<Cpu className="h-4 w-4 text-indigo-300" />}>
          <ValueRow label="CPU Threads" value={info.hardwareConcurrency || null} highlight />
          <ValueRow label="Device Memory" value={info.deviceMemory !== null ? `${info.deviceMemory} GB` : null} />
          <ValueRow label="Cookies" value={info.cookiesEnabled ? 'Enabled' : 'Disabled'} />
          <ValueRow label="Max Touch Points" value={info.touchPoints} />
        </SensorCard>

        <SensorCard title="Browser Details" icon={<Globe className="h-4 w-4 text-indigo-200" />}>
          <ValueRow label="Browser Name" value={info.browser} highlight />
          <ValueRow label="Version" value={info.browserVersion} />
          <ValueRow label="User Agent OS" value={info.os} />
          <ValueRow label="Online" value={navigator.onLine ? 'Yes' : 'No'} />
          <ValueRow label="Do Not Track" value={(navigator as any).doNotTrack === '1' ? 'Enabled' : 'Disabled'} />
        </SensorCard>
      </div>
    </div>
  );
}
