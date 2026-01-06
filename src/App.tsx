import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useSimulation from '@/hooks/useSimulation';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LiveMapPage from "./pages/LiveMapPage";
import GuardsPage from "./pages/GuardsPage";
import GuardPage from "./pages/GuardPage";
import SitesPage from "./pages/SitesPage";
import ReportsPage from "./pages/ReportsPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import ManageSitePage from "./pages/ManageSitePage";
import SupportPage from "./pages/SupportPage";

const queryClient = new QueryClient();

const App = () => {
  // start simulation hook (listens to demo-mode-changed/localStorage)
  useSimulation();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/live-map" element={<LiveMapPage />} />
            <Route path="/guards" element={<GuardsPage />} />
            <Route path="/guards/:id" element={<GuardPage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/manage-site/:id" element={<ManageSitePage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
