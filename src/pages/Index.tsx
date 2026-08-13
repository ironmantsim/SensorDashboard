import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHome } from '@/components/features/DashboardHome';
import { MotionSection } from '@/components/features/MotionSection';
import { LocationSection } from '@/components/features/LocationSection';
import { EnvironmentSection } from '@/components/features/EnvironmentSection';
import { BatterySection } from '@/components/features/BatterySection';
import { AudioSection } from '@/components/features/AudioSection';
import { CameraSection } from '@/components/features/CameraSection';
import { NetworkSection } from '@/components/features/NetworkSection';
import { DeviceSection } from '@/components/features/DeviceSection';
import { PermissionsSection } from '@/components/features/PermissionsSection';
import { SensorStatusSection } from '@/components/features/SensorStatusSection';
import { VisualizationSection } from '@/components/features/VisualizationSection';
import { RecordingSection } from '@/components/features/RecordingSection';
import { GroupSection } from '@/components/features/GroupSection';
import { AboutSection } from '@/components/features/AboutSection';
import { AccountSection } from '@/components/features/AccountSection';
import { AuthModal } from '@/components/features/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { NavSection } from '@/types/sensors';

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  motion: 'Motion Sensors',
  location: 'Location & Navigation',
  environment: 'Environmental Sensors',
  battery: 'Battery',
  audio: 'Audio Tools',
  camera: 'Camera',
  network: 'Network',
  device: 'Device Info',
  permissions: 'Permissions',
  status: 'Sensor Status',
  visualization: 'Data Visualization',
  recording: 'Sensor Recording',
  group: 'Group',
  account: 'Account Settings',
  about: 'About',
};

export default function Index() {
  const { user } = useAuth();

  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('sensor-dash-dark');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sensor-dash-dark', String(darkMode));
  }, [darkMode]);

  // Heartbeat: update last_seen every 30s when logged in
  useEffect(() => {
    if (!user) return;
    const update = () => {
      supabase
        .from('user_profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':     return <DashboardHome onNavigate={setActiveSection} />;
      case 'motion':        return <MotionSection />;
      case 'location':      return <LocationSection />;
      case 'environment':   return <EnvironmentSection />;
      case 'battery':       return <BatterySection />;
      case 'audio':         return <AudioSection />;
      case 'camera':        return <CameraSection />;
      case 'network':       return <NetworkSection />;
      case 'device':        return <DeviceSection />;
      case 'permissions':   return <PermissionsSection />;
      case 'status':        return <SensorStatusSection />;
      case 'visualization': return <VisualizationSection />;
      case 'recording':     return <RecordingSection />;
      case 'group':         return <GroupSection onOpenAuth={() => setAuthModalOpen(true)} />;
      case 'account':       return <AccountSection onOpenAuth={() => setAuthModalOpen(true)} />;
      case 'about':         return <AboutSection />;
      default:              return <DashboardHome onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />

      <div className="flex">
        <Sidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:ml-0">
          {activeSection !== 'dashboard' && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <button
                onClick={() => setActiveSection('dashboard')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </button>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-foreground font-medium">{SECTION_TITLES[activeSection]}</span>
            </div>
          )}
          {renderSection()}
        </main>
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
