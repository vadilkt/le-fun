import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile, UserRole, Permission } from '../types';
import { hasPermission, getDefaultRouteForRole } from '../types/roles';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: Error | null; session: Session | null }>;
  signOut: () => Promise<void>;
  can: (permission: Permission) => boolean;
  isRole: (...roles: UserRole[]) => boolean;
  getDefaultRoute: () => string;
  refreshProfile: () => Promise<void>;
}

interface SignUpMetadata {
  full_name: string;
  phone?: string;
  role?: UserRole;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Profil démo pour le mode sans Supabase
const DEMO_PROFILE: Profile = {
  id: 'demo',
  full_name: 'Admin Demo',
  role: 'admin',
  is_active: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Charger le profil depuis la base de données
  const loadProfile = async (userId: string): Promise<Profile | null> => {
    if (!supabase) return DEMO_PROFILE;

    // Timeout de 5s : si la requête bloque (ex : RLS récursif), on passe au fallback
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));

    const query = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }: { data: Profile | null; error: { message: string } | null }) => {
        if (error) {
          console.error('Erreur chargement profil:', error);
          return null;
        }
        return data as Profile;
      });

    return Promise.race([query, timeout]);
  };

  // Rafraîchir le profil
  const refreshProfile = async () => {
    if (user) {
      const newProfile = await loadProfile(user.id);
      setProfile(newProfile);
    }
  };

  // Initialisation
  useEffect(() => {
    // Mode démo sans Supabase
    if (!supabase) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    // Timeout de sécurité si onAuthStateChange ne répond jamais
    const safetyTimeout = setTimeout(() => {
      console.warn('[Le Fun] Timeout : Supabase n\'a pas répondu en 8s. Nettoyage de la session...');
      supabase.auth.signOut().catch(() => { });
      setLoading(false);
    }, 8000);

    // En Supabase JS v2, onAuthStateChange émet INITIAL_SESSION immédiatement
    // → getSession() est inutile et redondant
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        clearTimeout(safetyTimeout);
        setAuthError(null);

        // Session expirée ou déconnexion → nettoyage propre
        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setSession(newSession);
        setUser(newSession.user);

        // ─── Protection contre la perte de rôle ───────────────────────
        // TOKEN_REFRESHED se déclenche périodiquement. Si on recharge le
        // profil à chaque fois et que la requête échoue/timeout, le
        // fallback écrase le rôle admin → client.
        // Solution : ne recharger le profil que lors de la connexion
        // initiale, pas lors du refresh de token.
        // ──────────────────────────────────────────────────────────────
        if (event === 'TOKEN_REFRESHED') {
          // Token rafraîchi → on garde le profil existant, on met juste à jour session/user
          setLoading(false);
          return;
        }

        // INITIAL_SESSION ou SIGNED_IN → charger le profil
        try {
          let userProfile = await loadProfile(newSession.user.id);

          // Fallback : profil absent en base → rôle 'client' par sécurité
          // On ne fait JAMAIS confiance à user_metadata pour le rôle
          if (!userProfile) {
            const meta = newSession.user.user_metadata as { full_name?: string } | undefined;
            userProfile = {
              id: newSession.user.id,
              full_name: meta?.full_name ?? null,
              role: 'client',
              is_active: true,
            };
          }

          // Bloquer les comptes désactivés immédiatement
          if (!userProfile.is_active) {
            setAuthError('Votre compte a été désactivé. Contactez un administrateur.');
            await supabase.auth.signOut().catch(() => { });
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          setProfile(userProfile);
        } catch (err) {
          console.error('[Le Fun] Erreur chargement profil:', err);
          // Fallback garanti — toujours rôle 'client'
          const meta = newSession.user.user_metadata as { full_name?: string } | undefined;
          setProfile({
            id: newSession.user.id,
            full_name: meta?.full_name ?? null,
            role: 'client',
            is_active: true,
          });
        }

        setLoading(false);
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Connexion
  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      setProfile(DEMO_PROFILE);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  // Inscription — le rôle est TOUJOURS 'client' par sécurité
  // Seul un admin peut changer le rôle via le dashboard Supabase
  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    if (!supabase) {
      return { error: new Error('Supabase non configuré'), session: null };
    }

    setAuthError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name,
          phone: metadata.phone,
        },
      },
    });

    return { error: error as Error | null, session: data.session };
  };

  // Déconnexion
  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  // Vérifier une permission
  const can = (permission: Permission): boolean => {
    return hasPermission(profile?.role, permission);
  };

  // Vérifier si l'utilisateur a un des rôles spécifiés
  const isRole = (...roles: UserRole[]): boolean => {
    if (!profile?.role) return false;
    return roles.includes(profile.role);
  };

  // Obtenir la route par défaut
  const getDefaultRoute = (): string => {
    return getDefaultRouteForRole(profile?.role);
  };

  const value: AuthContextValue = {
    user,
    profile,
    session,
    loading,
    authError,
    signIn,
    signUp,
    signOut,
    can,
    isRole,
    getDefaultRoute,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook pour utiliser le contexte
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
