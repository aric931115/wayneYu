import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import BottomNav from "@/components/BottomNav";
import VoiceIndicator from "@/components/VoiceIndicator";
import Activities from "@/pages/Activities";
import ActivityDetail from "@/pages/ActivityDetail";
import TaskRoom from "@/pages/TaskRoom";
import CreateActivity from "@/pages/CreateActivity";
import ManageActivity from "@/pages/ManageActivity";
import Social from "@/pages/Social";
import Account from "@/pages/Account";
import SystemSettings from "@/pages/SystemSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthenticatedCreateActivity = () => {
  const { isAuthenticated } = useAppContext();
  return isAuthenticated ? <CreateActivity /> : <Navigate to="/account" replace />;
};

const AuthenticatedTaskRoom = () => {
  const { isAuthenticated } = useAppContext();
  return isAuthenticated ? <TaskRoom /> : <Navigate to="/account" replace />;
};

const AuthenticatedManageActivity = () => {
  const { isAuthenticated } = useAppContext();
  return isAuthenticated ? <ManageActivity /> : <Navigate to="/account" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="mx-auto min-h-screen w-full max-w-screen-xl bg-background relative shadow-xl">
            <VoiceIndicator />
            <Routes>
              <Route path="/" element={<Navigate to="/activities" replace />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/activities/create" element={<AuthenticatedCreateActivity />} />
              <Route path="/activities/:id" element={<ActivityDetail />} />
              <Route path="/activities/:id/room" element={<AuthenticatedTaskRoom />} />
              <Route path="/activities/:id/manage" element={<AuthenticatedManageActivity />} />
              <Route path="/social" element={<Social />} />
              <Route path="/account" element={<Account />} />
              <Route path="/settings" element={<SystemSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
