import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, getDefaultRoute, user, profile, loading: authLoading, authError } = useAuth();
  const navigate = useNavigate();

  // Dès que l'utilisateur est authentifié et le profil chargé → redirection
  useEffect(() => {
    if (!authLoading && user && profile) {
      navigate(getDefaultRoute(), { replace: true });
    }
  }, [authLoading, user, profile, navigate, getDefaultRoute]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message);
      }
      // Succès : l'auth state met à jour user + profile → le useEffect navigue
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <ChefHat size={48} />
          </div>
          <h1>Le Fun</h1>
          <p className="login-subtitle">Espace Personnel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {(error || authError) && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error || authError}</span>
            </div>
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
              />
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

      </div>
    </div>
  );
}
