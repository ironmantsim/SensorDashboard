import { Moon, Sun, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoImg from '@/assets/logo.png';

interface HeaderProps {
  darkMode: boolean;
  onToggleDark: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ darkMode, onToggleDark, sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-4 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Sensor Dashboard" className="w-8 h-8 rounded-lg object-cover shadow-[0_0_12px_hsl(var(--primary)/0.4)]" />
          <div>
            <h1 className="text-sm font-bold text-foreground leading-none">Sensor Dashboard</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Real-time device monitoring</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-medium text-green-600 dark:text-green-400">Live</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onToggleDark}
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-yellow-500" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
