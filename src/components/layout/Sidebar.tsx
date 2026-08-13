import { NavSection } from '@/types/sensors';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Cpu, MapPin, Thermometer, Battery,
  Mic, Camera, Wifi, Monitor, ShieldCheck, CheckCircle,
  BarChart2, X, Circle, Info, UserCircle2, LogIn, Users, Star,
} from 'lucide-react';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ElementType;
  color: string;
  proOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard, color: 'text-primary' },
  { id: 'motion',        label: 'Motion',         icon: Cpu,             color: 'text-violet-500' },
  { id: 'location',      label: 'Location & GPS', icon: MapPin,          color: 'text-emerald-500' },
  { id: 'environment',   label: 'Environment',    icon: Thermometer,     color: 'text-orange-500' },
  { id: 'battery',       label: 'Battery',        icon: Battery,         color: 'text-yellow-500' },
  { id: 'audio',         label: 'Audio',          icon: Mic,             color: 'text-pink-500' },
  { id: 'camera',        label: 'Camera',         icon: Camera,          color: 'text-blue-500' },
  { id: 'network',       label: 'Network',        icon: Wifi,            color: 'text-cyan-500' },
  { id: 'device',        label: 'Device Info',    icon: Monitor,         color: 'text-indigo-500' },
  { id: 'permissions',   label: 'Permissions',    icon: ShieldCheck,     color: 'text-teal-500' },
  { id: 'status',        label: 'Sensor Status',  icon: CheckCircle,     color: 'text-green-500' },
  { id: 'visualization', label: 'Visualization',  icon: BarChart2,       color: 'text-rose-500' },
  { id: 'recording',     label: 'Recording',      icon: Circle,          color: 'text-red-500' },
  { id: 'group',         label: 'Group',          icon: Users,           color: 'text-violet-500' },
  { id: 'about',         label: 'About',          icon: Info,            color: 'text-primary' },
];

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  open: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export function Sidebar({ activeSection, onNavigate, open, onClose, onOpenAuth }: SidebarProps) {
  const { user, loading: authLoading } = useAuth();

  const handleNav = (id: NavSection) => {
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 z-40 h-full w-60 bg-sidebar flex flex-col border-r border-sidebar-border transition-transform duration-200 ease-in-out',
        'pt-14',
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:z-auto lg:h-auto lg:pt-0'
      )}>
        {/* Mobile close */}
        <div className="flex items-center justify-between px-4 py-3 lg:hidden border-b border-sidebar-border">
          <span className="text-sm font-semibold text-sidebar-foreground">Navigation</span>
          <button onClick={onClose} className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Auth / Profile card */}
        <div className="px-2 pt-3 pb-2 border-b border-sidebar-border">
          {authLoading ? (
            <div className="h-9 rounded-lg bg-muted/30 animate-pulse" />
          ) : user ? (
            <button
              onClick={() => handleNav('account')}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all',
                activeSection === 'account'
                  ? 'bg-sidebar-primary/10 border border-sidebar-primary/20'
                  : 'hover:bg-sidebar-accent'
              )}
            >
              {/* Avatar */}
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover border border-primary/30 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-sidebar-foreground truncate">{user.username}</span>
                  {user.plan === 'pro' && (
                    <span className="flex-shrink-0 flex items-center gap-0.5 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded">
                      <Star className="h-2 w-2 fill-amber-500" />PRO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-sidebar-foreground/50">Online · Account</span>
                </div>
              </div>
              <UserCircle2 className="h-3.5 w-3.5 text-sidebar-foreground/30 flex-shrink-0" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In / Sign Up
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 mb-0.5 group',
                  isActive
                    ? 'bg-sidebar-primary/10 border border-sidebar-primary/20 text-sidebar-primary font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? item.color : 'text-current')} />
                <span className="text-sm truncate">{item.label}</span>
                {isActive && <div className="ml-auto w-1 h-4 rounded-full bg-sidebar-primary" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="text-[10px] text-sidebar-foreground/40 text-center">
            Sensor Dashboard v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
