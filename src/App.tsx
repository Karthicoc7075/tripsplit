import { Suspense, lazy } from "react";
import { MotionConfig } from "framer-motion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { Toaster } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import GlobalLayout from "@/components/layout/GlobalLayout";
import PageTitle from "@/components/PageTitle";

/**
 * Routes are split so the login screen no longer waits on Recharts and the
 * whole app graph. Each page arrives on first navigation and is cached from
 * then on.
 */
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Friends = lazy(() => import("@/pages/Friends"));
const FriendDetail = lazy(() => import("@/pages/FriendDetail"));
const Outings = lazy(() => import("@/pages/Outings"));
const OutingDetail = lazy(() => import("@/pages/OutingDetail"));
const SettleUp = lazy(() => import("@/pages/SettleUp"));
const Reports = lazy(() => import("@/pages/Reports"));
const Settings = lazy(() => import("@/pages/Settings"));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function App() {
  const isMobile = useMediaQuery("(max-width: 767px)");

  return (
    // reducedMotion="user" honours the OS setting for every Framer animation in
    // the app at once — cards, lists and route changes all stop moving for users
    // who ask for that, instead of each component opting in.
    <MotionConfig reducedMotion="user">
    <AuthProvider>
      <DataProvider>
      <Router>
        <PageTitle />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Redirect root to dashboard (which redirects to login if unauthenticated) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<GlobalLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/friends/details/:id" element={<FriendDetail />} />
              <Route path="/outings" element={<Outings />} />
              <Route path="/outings/:id" element={<OutingDetail />} />
              <Route path="/settle" element={<SettleUp />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </Router>
      {/* Bottom-centre on phones: top-right sits under the notch, far from the
          thumb, and made the Undo action in delete/settle toasts the hardest
          thing on screen to reach. Offset clears the bottom tab bar. */}
      <Toaster
        position={isMobile ? "bottom-center" : "top-right"}
        offset={isMobile ? 80 : 16}
        richColors
        closeButton
      />
      </DataProvider>
    </AuthProvider>
    </MotionConfig>
  );
}

export default App;
