import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import Index from "./pages/Index";
import Matches from "./pages/Matches";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import AdminCities from "./pages/AdminCities";
import Settings from "./pages/Settings";
import Verification from "./pages/Verification";
import Onboarding from "./pages/Onboarding";
import LikesMe from "./pages/LikesMe";
import Premium from "./pages/Premium";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";

const queryClient = new QueryClient();

const NotificationListener = () => {
  useRealtimeNotifications();
  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const run = async () => {
      const [{ data: profile }, { data: photos }] = await Promise.all([
        (supabase as any).from("profiles").select("name, avatar_url, onboarding_completed").eq("user_id", user.id).maybeSingle(),
        supabase.from("profile_photos").select("id").eq("user_id", user.id).limit(1),
      ]);
      if (cancelled) return;
      const missingBasics = !profile?.onboarding_completed && (!profile?.name?.trim() || (!profile?.avatar_url && !photos?.length));
      setNeedsOnboarding(Boolean(missingBasics));
      setCheckingProfile(false);
    };
    run();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (user && checkingProfile) return null;
  if (user && needsOnboarding && location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <NotificationListener />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
            <Route path="/likes" element={<ProtectedRoute><LikesMe /></ProtectedRoute>} />
            <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/chat/:matchId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/admin/cities" element={<ProtectedRoute><AdminCities /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
