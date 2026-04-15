import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface PublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const session = useAuthStore((state) => state.session);
  const isOnboarded = useAuthStore((state) => state.isOnboarded);

  if (!session) {
    return <>{children}</>;
  }

  return <Navigate to={isOnboarded ? '/home' : '/onboarding'} replace />;
}
