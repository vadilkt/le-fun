import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo }: ProtectedRouteProps) {
  const { user, profile, loading, getDefaultRoute } = useAuth();
  const location = useLocation();

  // Afficher le chargement
  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  // Rediriger vers login si non authentifié
  if (!user) {
    // Déterminer la page de login appropriée
    const isCustomerRoute = location.pathname.startsWith('/customer');
    const loginPath = isCustomerRoute ? '/customer/login' : '/backoffice';

    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Vérifier si le compte est actif (AVANT le rôle pour ne rien exposer)
  if (profile && !profile.is_active) {
    return (
      <div className="access-denied">
        <h2>Compte désactivé</h2>
        <p>Votre compte a été désactivé. Contactez un administrateur.</p>
      </div>
    );
  }

  // Vérifier si le profil existe et si le rôle est autorisé
  if (!profile || !allowedRoles.includes(profile.role)) {
    // Rediriger vers la route par défaut du rôle ou la redirection spécifiée
    const targetRoute = redirectTo || getDefaultRoute();
    return <Navigate to={targetRoute} replace />;
  }

  return <>{children}</>;
}

// Composant pour protéger des éléments UI selon le rôle
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { profile } = useAuth();

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
