
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// 原本的 AppContext
import { AppProvider } from "@/contexts/AppContext";

// 新增：Supabase AuthContext
import { AuthProvider } from "@/contexts/AuthContext";

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
import SupabaseTest from "@/pages/SupabaseTest";
import NotFound from "./pages/NotFound";
import SupabaseAuth from "@/pages/SupabaseAuth";

const queryClient = new QueryClient();

// 活動是開放式互動：訪客與會員都可建立、參加、進入任務房間。
// 本階段活動/任務使用瀏覽器展示資料；正式權限由後續 Supabase RLS/RPC 實作。
const AuthenticatedCreateActivity = () => <CreateActivity />;
const AuthenticatedTaskRoom = () => <TaskRoom />;
const AuthenticatedManageActivity = () => <ManageActivity />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <div className="mx-auto min-h-screen w-full max-w-screen-xl bg-background relative shadow-xl">

              <VoiceIndicator />

              <Routes>
                {/* 首頁 */}
                <Route
                  path="/"
                  element={<Navigate to="/activities" replace />}
                />

                {/* 活動相關頁面 */}
                <Route
                  path="/activities"
                  element={<Activities />}
                />

                <Route
                  path="/activities/create"
                  element={<AuthenticatedCreateActivity />}
                />

                <Route
                  path="/activities/:id"
                  element={<ActivityDetail />}
                />

                <Route
                  path="/activities/:id/room"
                  element={<AuthenticatedTaskRoom />}
                />

                <Route
                  path="/activities/:id/manage"
                  element={<AuthenticatedManageActivity />}
                />

                {/* 社交功能 */}
                <Route
                  path="/social"
                  element={<Social />}
                />

                {/* 帳號管理 */}
                <Route
                  path="/account"
                  element={<Account />}
                />

                {/* 系統設定 */}
                <Route
                  path="/settings"
                  element={<SystemSettings />}
                />

                {/* Supabase 資料庫測試 */}
                <Route
                  path="/supabase-test"
                  element={<SupabaseTest />}
                />

                {/* 找不到頁面 */}
                <Route
                  path="*"
                  element={<NotFound />}
                />
                <Route
                  path="/auth"
                  element={<SupabaseAuth />}
                />
              </Routes>


              <BottomNav />

            </div>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
