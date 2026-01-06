import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { mockGuards, mockSites } from '@/data/mockData';

type Item = {
  id: string;
  type: 'guard' | 'site';
  title: string;
  subtitle?: string;
};

export default function CommandSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    const onOpenEvent = () => setOpen(true);
    window.addEventListener('open-command-search', onOpenEvent as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-search', onOpenEvent as EventListener);
    };
  }, []);

  const items: Item[] = useMemo(() => {
    const guards = mockGuards.map(g => ({
      id: g.id,
      type: 'guard' as const,
      title: g.name,
      subtitle: g.employeeId,
    }));
    const sites = mockSites.map(s => ({
      id: s.id,
      type: 'site' as const,
      title: s.name,
      subtitle: s.address,
    }));
    return [...guards, ...sites];
  }, []);

  const onSelect = (item: Item) => {
    setOpen(false);
    if (item.type === 'guard') {
      navigate(`/guards/${item.id}`);
    } else {
      navigate(`/live-map?site=${encodeURIComponent(item.id)}`);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search guards, employees, or sites... (Cmd/Ctrl+K)" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Guards">
          {items.filter(i => i.type === 'guard').map(it => (
            <CommandItem key={it.id} onSelect={() => onSelect(it)}>
              <div className="flex flex-col">
                <span className="text-sm">{it.title}</span>
                <span className="text-xs text-muted-foreground">{it.subtitle}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Sites">
          {items.filter(i => i.type === 'site').map(it => (
            <CommandItem key={it.id} onSelect={() => onSelect(it)}>
              <div className="flex flex-col">
                <span className="text-sm">{it.title}</span>
                <span className="text-xs text-muted-foreground">{it.subtitle}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
