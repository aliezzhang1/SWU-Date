import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LoadingScreen } from '../ui/LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
  allowIncompleteOnboarding?: boolean;
}

function isLocalMatchLetterPreview(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  return isLocalHost && new URLSearchParams(window.location.search).get('previewMatchLetter') === '1';
}

export function ProtectedRoute({ children, allowIncompleteOnboarding = false }: ProtectedRouteProps) {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isOnboarded = useAuthStore((state) => state.isOnboarded);

  if (isLoading) {
    return <LoadingScreen message="正在确认登录状态..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowIncompleteOnboarding && !isOnboarded && !isLocalMatchLetterPreview()) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
