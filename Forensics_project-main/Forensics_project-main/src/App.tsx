import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { InvestigationProvider } from "@/contexts/InvestigationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import OfficerDashboard from "@/pages/OfficerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import UploadPage from "@/pages/UploadPage";
import DashboardPage from "@/pages/DashboardPage";
import AIChatPage from "@/pages/AIChatPage";
import NetworkGraphPage from "@/pages/NetworkGraphPage";
import ReportPage from "@/pages/ReportPage";
import ImagesPage from "@/pages/ImagesPage";
import TimelinePage from "@/pages/TimelinePage";
import SearchPage from "@/pages/SearchPage";
import GeospatialPage from "@/pages/GeospatialPage";
import CasePage from "@/pages/CasePage";
import NotFound from "./pages/NotFound";
import ForensicsCompass from "./pages/ForensicsCompass";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState(null); // { role: 'officer' | 'admin', id: string }

  const handleLogin = (role: string, id: string) => {
    setUser({ role, id });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('forensix_token');
    localStorage.removeItem('forensix_user');
  };

  try {
    // Not logged in → show Login
    if (!user) {
      return <Login onLogin={handleLogin} />;
    }

    // Logged in → show full app with routing
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NotificationProvider>
            <KeyboardShortcutsProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <InvestigationProvider>
                  <BrowserRouter>
                    <Layout user={user} onLogout={handleLogout}>
                      <Routes>
                        {/* Officer-only routes */}
                        {user.role === "officer" && (
                          <Route path="/officer" element={<OfficerDashboard user={user} onLogout={handleLogout} />} />
                        )}
                        
                        {/* Admin-only routes */}
                        {user.role === "admin" && (
                          <Route path="/admin" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
                        )}

                        {/* Common routes for both roles */}
                        <Route path="/" element={<UploadPage />} />
                        <Route path="/forensics" element={<ForensicsCompass />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/geospatial" element={<GeospatialPage />} />
                        <Route path="/cases" element={<CasePage />} />
                        <Route path="/chat" element={<AIChatPage />} />
                        <Route path="/graph" element={<NetworkGraphPage />} />
                        <Route path="/timeline" element={<TimelinePage />} />
                        <Route path="/images" element={<ImagesPage />} />
                        <Route path="/report" element={<ReportPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  </BrowserRouter>
                </InvestigationProvider>
              </TooltipProvider>
            </KeyboardShortcutsProvider>
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("App render error:", error);
    return (
      <div style={{ padding: '20px', background: '#000', color: '#fff', minHeight: '100vh' }}>
        <h1 style={{ color: '#ff4444' }}>FORENSIX - App Error</h1>
        <p>Failed to render the application:</p>
        <pre style={{ color: '#ffaaaa' }}>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
    );
  }
};

export default App;