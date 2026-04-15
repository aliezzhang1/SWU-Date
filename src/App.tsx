import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './components/routes/AdminRoute';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { PublicRoute } from './components/routes/PublicRoute';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ToastViewport } from './components/ui/ToastViewport';
import { useAuthStore } from './store/authStore';
import { AdminPage } from './pages/AdminPage';
import { BlocklistPage } from './pages/BlocklistPage';
import { DisclaimerPage } from './pages/DisclaimerPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { MePage } from './pages/MePage';
import { MessagesPage } from './pages/MessagesPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (isBootstrapping) {
    return <LoadingScreen message="正在同步 SWU Date 账户..." />;
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute allowIncompleteOnboarding>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches/:matchId"
          element={
            <ProtectedRoute>
              <MatchDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:matchId"
          element={
            <ProtectedRoute>
              <MatchDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me"
          element={
            <ProtectedRoute>
              <MePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/edit"
          element={
            <ProtectedRoute>
              <EditProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me/blocklist"
          element={
            <ProtectedRoute>
              <BlocklistPage />
            </ProtectedRoute>
          }
        />
        <Route path="/legal/disclaimer" element={<DisclaimerPage />} />
        <Route path="/legal/privacy" element={<PrivacyPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastViewport />
    </>
  );
}

