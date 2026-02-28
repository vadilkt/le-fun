import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, ClipboardList, UtensilsCrossed, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../hooks/useCart';

export function CustomerLayout() {
  const { profile, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/customer/login');
  };

  return (
    <div className="customer-layout">
      {/* Header */}
      <header className="customer-header">
        <div className="customer-header-content">
          {/* Logo */}
          <NavLink to="/customer" className="customer-logo">
            <div className="logo-circle">
              <UtensilsCrossed size={24} />
            </div>
            <span className="logo-text">Le Fun</span>
          </NavLink>

          {/* Navigation desktop */}
          <nav className="customer-nav desktop-nav">
            <NavLink to="/customer" end className="nav-link">
              Menu
            </NavLink>
            <NavLink to="/customer/orders" className="nav-link">
              Mes commandes
            </NavLink>
          </nav>

          {/* Actions */}
          <div className="customer-actions">
            <NavLink to="/customer/cart" className="cart-button">
              <ShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="cart-badge">{itemCount}</span>
              )}
            </NavLink>

            <div className="user-menu">
              <button className="user-button">
                <User size={20} />
                <span className="user-name">{profile?.full_name || 'Mon compte'}</span>
              </button>
              <div className="user-dropdown">
                <NavLink to="/customer/orders" className="dropdown-item">
                  <ClipboardList size={16} />
                  Mes commandes
                </NavLink>
                <button onClick={handleSignOut} className="dropdown-item logout">
                  <LogOut size={16} />
                  Déconnexion
                </button>
              </div>
            </div>

            {/* Menu mobile toggle */}
            <button className="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Navigation mobile */}
        {menuOpen && (
          <nav className="customer-nav mobile-nav">
            <NavLink to="/customer" end className="nav-link" onClick={() => setMenuOpen(false)}>
              Menu
            </NavLink>
            <NavLink to="/customer/orders" className="nav-link" onClick={() => setMenuOpen(false)}>
              Mes commandes
            </NavLink>
            <NavLink to="/customer/cart" className="nav-link" onClick={() => setMenuOpen(false)}>
              Panier ({itemCount})
            </NavLink>
            <button onClick={handleSignOut} className="nav-link logout">
              Déconnexion
            </button>
          </nav>
        )}
      </header>

      {/* Contenu principal */}
      <main className="customer-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="customer-footer">
        <div className="footer-content">
          <div className="footer-info">
            <h3>Le Fun Restaurant</h3>
            <p>Yaoundé, Cameroun</p>
          </div>
          <div className="footer-links">
            <p>Ouvert tous les jours de 11h à 23h</p>
          </div>
        </div>
        <div className="footer-copyright">
          <p>&copy; {new Date().getFullYear()} Le Fun. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
