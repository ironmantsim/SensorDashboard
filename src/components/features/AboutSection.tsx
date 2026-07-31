import { SensorCard } from '@/components/features/SensorCard';
import {
  Mail, Globe, Cpu, MapPin, Battery, Wifi, Mic,
  Camera, Activity, Shield, BarChart2, Info, Code2, Heart,
  Smartphone, ExternalLink, Lock,
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { cn } from '@/lib/utils';

const FEATURES = [
  { icon: Activity, label: 'Motion Sensors', desc: 'Accelerometer, Gyroscope & Orientation', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { icon: MapPin, label: 'GPS & Maps', desc: 'Real-time location with embedded map', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: Battery, label: 'Battery', desc: 'Level, charging state & estimates', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { icon: Mic, label: 'Audio', desc: 'Microphone & waveform visualizer', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { icon: Camera, label: 'Camera', desc: 'Front & rear live preview + capture', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Wifi, label: 'Network', desc: 'Speed test, connection info & type', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { icon: Cpu, label: 'Device Info', desc: 'OS, browser, screen & hardware details', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { icon: Shield, label: 'Permissions', desc: 'Sensor permission management center', color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { icon: BarChart2, label: 'Visualization', desc: 'Real-time charts & CSV/JSON export', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { icon: Activity, label: 'Recording', desc: 'Record sensor sessions & download data', color: 'text-red-500', bg: 'bg-red-500/10' },
];

const TECH_STACK = [
  'React 18', 'TypeScript', 'Vite', 'Tailwind CSS',
  'Recharts', 'Browser Sensor APIs', 'PWA / Service Worker', 'Generic Sensor API',
];

const PRIVACY_ITEMS = [
  {
    icon: Shield,
    title: 'No Data Collection',
    desc: 'Sensor readings are processed entirely in your browser and never transmitted to any server or third party.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: Globe,
    title: 'No Backend or Server',
    desc: 'This app has zero server-side components — it runs 100% client-side in your browser using standard Web APIs.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Smartphone,
    title: 'Data Stays On-Device',
    desc: 'Nothing leaves your device. Recorded sessions exist only in memory and are discarded when you close the tab unless you download them.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Lock,
    title: 'No Analytics or Tracking',
    desc: 'No cookies, no third-party scripts, no fingerprinting, no ad networks — your data is yours alone.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
];

export function AboutSection() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h2 className="section-title flex items-center gap-2">
        <Info className="h-5 w-5 text-primary" /> About
      </h2>

      {/* Hero card */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-5">
        <img
          src={logoImg}
          alt="Sensor Dashboard Logo"
          className="w-20 h-20 rounded-2xl shadow-lg shadow-primary/20 flex-shrink-0"
        />
        <div className="text-center sm:text-left">
          <h1 className="text-xl font-bold text-foreground">Phone Sensor Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            A real-time browser-based sensor explorer that surfaces every device API
            your browser exposes — from accelerometer to ambient light — in a single
            unified interface, with live charts, session recording, and data export.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 font-medium">
              <Smartphone className="h-3 w-3" /> PWA Ready
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] bg-green-500/10 text-green-500 border border-green-500/20 rounded-full px-2.5 py-0.5 font-medium">
              <Globe className="h-3 w-3" /> Browser-only
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] bg-violet-500/10 text-violet-500 border border-violet-500/20 rounded-full px-2.5 py-0.5 font-medium">
              <Shield className="h-3 w-3" /> No backend
            </span>
          </div>
        </div>
      </div>

      {/* Developer card */}
      <SensorCard title="Developer" icon={<Code2 className="h-4 w-4 text-primary" />}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar placeholder */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/40 to-violet-500/40 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
            <Code2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Independent Developer</div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Passionate about browser APIs, real-time data, and building practical tools that run anywhere — no app store required.
            </p>
            {/* Contact links */}
            <div className="mt-3 flex flex-col gap-2">
              <a
                href="mailto:dev-sensordash@proton.me"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/25 text-primary text-xs font-medium hover:bg-primary/20 transition-colors group w-fit"
              >
                <Mail className="h-3.5 w-3.5" />
                dev-sensordash@proton.me
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity ml-auto" />
              </a>
              <a
                href="https://x.com/sensordash"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground/5 border border-border/40 text-foreground/70 text-xs font-medium hover:bg-foreground/10 transition-colors group w-fit"
              >
                <span className="font-bold text-sm leading-none">𝕏</span>
                @sensordash
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity ml-auto" />
              </a>
            </div>
          </div>
        </div>
      </SensorCard>

      {/* Privacy & Data */}
      <SensorCard title="Privacy & Data" icon={<Lock className="h-4 w-4 text-green-500" />}>
        <div className="space-y-1">
          {PRIVACY_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', item.bg)}>
                  <Icon className={cn('h-4 w-4', item.color)} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{item.title}</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </SensorCard>

      {/* Features grid */}
      <SensorCard title="What's Inside" icon={<Smartphone className="h-4 w-4 text-cyan-400" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', f.bg)}>
                  <Icon className={cn('h-4 w-4', f.color)} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{f.label}</div>
                  <div className="text-[11px] text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </SensorCard>

      {/* Tech stack */}
      <SensorCard title="Built With" icon={<Globe className="h-4 w-4 text-indigo-400" />}>
        <div className="flex flex-wrap gap-2">
          {TECH_STACK.map(tech => (
            <span
              key={tech}
              className="text-xs bg-muted/60 border border-border/60 rounded-full px-3 py-1 text-foreground/80 font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </SensorCard>

      {/* Footer note */}
      <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
        <Heart className="h-3.5 w-3.5 text-red-400" />
        Built with care using browser-only APIs — no servers, no tracking, no data collection.
      </div>
    </div>
  );
}
