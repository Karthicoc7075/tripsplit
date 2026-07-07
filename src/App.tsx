import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { Toaster } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import GlobalLayout from "@/components/layout/GlobalLayout";
// Auth Pages
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";

// Main Pages
import Dashboard from "@/pages/Dashboard";
import Friends from "@/pages/Friends";
import FriendDetail from "@/pages/FriendDetail";
import Outings from "@/pages/Outings";
import OutingDetail from "@/pages/OutingDetail";
import SettleUp from "@/pages/SettleUp";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";

function App() {
  return (
    <AuthProvider>
      <DataProvider>
      <Router>
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
      </Router>
      <Toaster position="top-right" richColors closeButton />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
