import { useEffect, useRef } from 'react';
import { mockGuards } from '@/data/mockData';

const RANDOM_DELTA = 0.0001; // degrees

function randDelta() {
  return (Math.random() * 2 - 1) * RANDOM_DELTA;
}

export default function useSimulation() {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const applyStep = () => {
      let changed = false;
      mockGuards.forEach(g => {
        if (g.status === 'online' && g.location) {
          // mutate in place so consumers referencing mockGuards see updated coords
          g.location.lat = g.location.lat + randDelta();
          g.location.lng = g.location.lng + randDelta();
          // append to history (keep length reasonable)
          try {
            if (!g.locationHistory) g.locationHistory = [];
            g.locationHistory.push({ lat: g.location.lat, lng: g.location.lng, at: new Date() });
            if (g.locationHistory.length > 50) g.locationHistory.shift();
          } catch (e) {}
          changed = true;
        }
      });

      if (changed) {
        try {
          window.dispatchEvent(new CustomEvent('guards-updated'));
        } catch (e) {}
      }
    };

    const start = () => {
      if (intervalRef.current) return;
      intervalRef.current = window.setInterval(applyStep, 5000);
    };

    // periodic backend sync for moved guards (every 30s)
    let syncRef: number | null = null;
    const lastSentPos: Record<string, string> = {};
    const doSync = async () => {
      try {
        const toSync = mockGuards.filter(g => g.location).filter(g => {
          const key = `${g.location!.lat},${g.location!.lng}`;
          if (lastSentPos[g.id] === key) return false;
          lastSentPos[g.id] = key;
          return true;
        });
        for (const g of toSync) {
          // fire-and-forget update
          try {
            await fetch(`http://localhost:4000/api/guards/${g.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...g,
                lastSeen: new Date().toISOString(),
              }),
            });
          } catch (e) {
            // ignore individual failures
          }
        }
      } catch (e) {}
    };

    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (syncRef) { clearInterval(syncRef); syncRef = null; }
    };

    const onDemoMode = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const enabled = typeof detail === 'boolean' ? detail : (window.localStorage.getItem('demo_mode') === '1');
      if (enabled) start(); else stop();
    };

    // start/stop based on current localStorage value
    try {
      const enabled = typeof window !== 'undefined' && window.localStorage.getItem('demo_mode') === '1';
      if (enabled) start();
    } catch (e) {}

    // start sync loop regardless of demo_mode (only when running in browser)
    try {
      syncRef = window.setInterval(() => { doSync(); }, 30000);
    } catch (e) {}

    window.addEventListener('demo-mode-changed', onDemoMode as EventListener);

    return () => {
      stop();
      window.removeEventListener('demo-mode-changed', onDemoMode as EventListener);
    };
  }, []);
}
