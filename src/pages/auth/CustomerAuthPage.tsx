import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Mail, Lock, User, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type AuthMode = 'login' | 'register';

export function CustomerAuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Dès que l'utilisateur est authentifié et le profil chargé → redirection
  useEffect(() => {
    console.log('[Auth] useEffect →', { authLoading, user: !!user, profile: !!profile, role: profile?.role });
    if (!authLoading && user && profile) {
      console.log('[Auth] Navigation vers /customer');
      navigate('/customer', { replace: true });
    }
  }, [authLoading, user, profile, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        setLoading(false);
        return;
      }

      try {
        const { error: signUpError, session } = await signUp(email, password, {
          full_name: fullName,
          phone: phone || undefined,
          role: 'client',
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (session) {
          // Email confirmation désactivée : connecté immédiatement
          // Le useEffect ci-dessus détectera user + profile et naviguera
        } else {
          // Email confirmation activée : demander de vérifier l'email
          setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
          setTimeout(() => {
            setMode('login');
            setSuccess(null);
          }, 3000);
        }
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message);
        }
        // Succès : le useEffect navigue dès que user + profile sont disponibles
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="customer-auth-wrapper">
      <div className="customer-auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <UtensilsCrossed size={48} />
          </div>
          <h1>Le Fun Restaurant</h1>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Connexion à votre compte' : 'Créer un compte'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-message">
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div className="field">
                <label htmlFor="fullName">Nom complet</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Dupont"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="phone">Téléphone (optionnel)</label>
                <div className="input-with-icon">
                  <Phone size={18} className="input-icon" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                  />
                </div>
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="field">
              <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading
              ? mode === 'login' ? 'Connexion...' : 'Création...'
              : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <p>
              Pas encore de compte ?{' '}
              <button type="button" onClick={toggleMode} className="link-button">
                Créer un compte
              </button>
            </p>
          ) : (
            <p>
              Déjà un compte ?{' '}
              <button type="button" onClick={toggleMode} className="link-button">
                Se connecter
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
