import '../App.css';
import { ChefHat } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [email, setEmail] = useState('admin@lefun.cm');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!supabase) {
      // Mode démo : pas de Supabase configuré
      navigate('/');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('/');
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="logo-circle">
            <ChefHat size={26} color="#fff" />
          </div>
          <div>
            <div className="app-title">Le Fun – Gestion Restaurant</div>
            <div className="app-subtitle">Connexion à l’espace de gestion</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email professionnel</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lefun.cm"
              required
            />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="muted" style={{ color: '#b91c1c' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: '1rem' }}>
          Crée d&apos;abord un utilisateur dans Supabase (Auth &gt; Users) avec ce
          courriel, ou adapte l&apos;email ici.
        </p>
      </div>
    </div>
  );
}

