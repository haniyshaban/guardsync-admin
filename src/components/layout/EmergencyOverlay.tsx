import React, { useEffect, useState } from 'react';
import { Guard } from '@/types';
import { Button } from '@/components/ui/button';
import { mockGuards } from '@/data/mockData';
import { toast as sonnerToast } from '@/components/ui/sonner';
import { useSidebar } from './SidebarContext';

interface EmergencyOverlayProps {
  guards?: Guard[];
}

export function EmergencyOverlay({ guards = [] }: EmergencyOverlayProps) {
  const panicGuards = guards.filter(g => g.status === 'panic');
  if (!panicGuards.length) return null;

  const { collapsed } = useSidebar();
  const [isDesktop, setIsDesktop] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 640 : true);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const leftOffset = isDesktop ? (collapsed ? '72px' : '16rem') : '0px';
  const first = panicGuards[0];
  const names = panicGuards.length === 1 ? first.name : `${first.name} +${panicGuards.length - 1} more`;

  const handleDispatch = async (guardId?: string) => {
    // Placeholder: wire this up to a real dispatch/notification system
    console.warn('Dispatch requested for', guardId || 'multiple');
    alert(`Dispatching help for ${guardId || 'guards in panic'}`);
  };

  const handleDismiss = () => {
    // Mark demo panic dismissed so it won't be re-added by mockData
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem('demo_panic_dismissed', '1');
    } catch (e) {}

    // Clear panic status for demo guards and reload to reflect changes across pages
    const changed: string[] = [];
    mockGuards.forEach(g => {
      if (g.status === 'panic') {
        g.status = 'online';
        g.lastPinged = new Date();
        changed.push(g.id);
      }
    });
    sonnerToast.success(`Cleared panic for ${changed.length} guard(s)`);
    // small delay so toast is visible, then reload to update local pages
    setTimeout(() => {
      try { window.location.reload(); } catch (e) { /* ignore */ }
    }, 700);
  };

  return (
    <div
      style={{ left: leftOffset, right: 0, width: `calc(100% - ${leftOffset})` }}
      className="fixed top-0 z-[99999] flex items-center justify-between gap-4 p-3 px-4 bg-[hsl(var(--status-panic))] text-white shadow-lg"
    >
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-white/90 animate-pulse" />
        <div className="font-semibold">EMERGENCY: {names}</div>
        <div className="text-sm text-white/90 ml-2">High priority panic alert</div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="destructive" onClick={() => handleDispatch(first.id)}>Dispatch Help</Button>
        <Button variant="ghost" onClick={handleDismiss}>Dismiss</Button>
      </div>
    </div>
  );
}

export default EmergencyOverlay;
