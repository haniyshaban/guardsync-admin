import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useNavigate } from 'react-router-dom';
import { Menu, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gw_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail;
        setSidebarCollapsed(Boolean(detail));
      } catch (err) {}
    };
    window.addEventListener('gw:sidebar:toggle', handler as EventListener);
    return () => window.removeEventListener('gw:sidebar:toggle', handler as EventListener);
  }, []);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Mobile top bar */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40">
        <div className="p-2 bg-background border-b flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="font-semibold">GuardSync</div>
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <main className={`${sidebarCollapsed ? 'sm:ml-[72px]' : 'sm:ml-64'} min-h-screen transition-all duration-200 animate-fade-in pt-12`}>
        {children}
      </main>
    </div>
  );
}
