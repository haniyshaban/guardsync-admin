import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background bg-grid">
      <Sidebar />
      <main className="ml-64 min-h-screen transition-all duration-200 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
