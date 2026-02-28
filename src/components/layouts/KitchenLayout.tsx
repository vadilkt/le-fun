import { Outlet, useNavigate } from 'react-router-dom';
import { ChefHat, LogOut, Bell, BellOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function KitchenLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mettre à jour l'heure toutes les secondes
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <div className="kitchen-layout">
      {/* Header minimaliste */}
      <header className="kitchen-header">
        <div className="kitchen-header-left">
          <div className="kitchen-logo">
            <ChefHat size={32} />
            <span>Cuisine</span>
          </div>
          <div className="kitchen-time">
            {currentTime.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        </div>

        <div className="kitchen-header-right">
          <button
            className={`sound-toggle ${soundEnabled ? 'enabled' : 'disabled'}`}
            onClick={toggleSound}
            title={soundEnabled ? 'Désactiver les sons' : 'Activer les sons'}
          >
            {soundEnabled ? <Bell size={24} /> : <BellOff size={24} />}
          </button>

          <div className="kitchen-user">
            <span>{profile?.full_name}</span>
          </div>

          <button onClick={handleSignOut} className="kitchen-logout">
            <LogOut size={24} />
          </button>
        </div>
      </header>

      {/* Contenu plein écran */}
      <main className="kitchen-main">
        <Outlet context={{ soundEnabled }} />
      </main>
    </div>
  );
}

// Hook pour accéder au contexte du layout cuisine
import { useOutletContext } from 'react-router-dom';

interface KitchenContext {
  soundEnabled: boolean;
}

export function useKitchenContext(): KitchenContext {
  return useOutletContext<KitchenContext>();
}
