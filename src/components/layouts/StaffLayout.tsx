import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  ChefHat,
  LayoutDashboard,
  ClipboardList,
  Package,
  Users,
  DollarSign,
  UtensilsCrossed,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../types/roles';

export function StaffLayout() {
  const { profile, signOut, can } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Déterminer le préfixe de route selon le rôle
  const isAdmin = profile?.role === 'admin';
  const routePrefix = isAdmin ? '/admin' : '/staff';

  return (
    <div className="staff-layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-logo">
          <div className="logo-circle">
            <ChefHat size={24} />
          </div>
          <div className="header-title">
            <span className="title-main">Le Fun – Gestion Restaurant</span>
            <span className="title-sub">Yaoundé, Cameroun</span>
          </div>
        </div>
        <div className="header-right">
          <span className="role-badge">{ROLE_LABELS[profile?.role || 'serveur']}</span>
          <span className="beta-badge">Bêta</span>
        </div>
      </header>

      {/* Layout principal */}
      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Section Navigation */}
          <span className="sidebar-section-label">Navigation</span>

          {/* Dashboard - Manager et Admin */}
          {can('VIEW_DASHBOARD') && (
            <NavItem
              to={`${routePrefix}`}
              icon={<LayoutDashboard size={18} />}
              label="Tableau de bord"
              end
            />
          )}

          {/* Commandes - Tout le staff */}
          <NavItem
            to={`${routePrefix}/orders`}
            icon={<ClipboardList size={18} />}
            label="Commandes"
          />

          {/* Menus - Manager et Admin */}
          {can('EDIT_MENUS') && (
            <NavItem
              to={`${routePrefix}/menus`}
              icon={<UtensilsCrossed size={18} />}
              label="Menus"
            />
          )}

          {/* Section Administration */}
          {(can('MANAGE_INVENTORY') || can('VIEW_ACCOUNTING') || can('MANAGE_EMPLOYEES')) && (
            <span className="sidebar-section-label">Administration</span>
          )}

          {/* Inventaire - Admin seulement */}
          {can('MANAGE_INVENTORY') && (
            <NavItem
              to="/admin/inventory"
              icon={<Package size={18} />}
              label="Inventaire"
            />
          )}

          {/* Comptabilité - Manager et Admin */}
          {can('VIEW_ACCOUNTING') && (
            <NavItem
              to="/admin/accounting"
              icon={<DollarSign size={18} />}
              label="Comptabilité"
            />
          )}

          {/* Employés - Admin seulement */}
          {can('MANAGE_EMPLOYEES') && (
            <NavItem
              to="/admin/employees"
              icon={<Users size={18} />}
              label="Employés"
            />
          )}

          {/* Poussé en bas */}
          <div className="sidebar-spacer" />

          {/* Déconnexion */}
          <button onClick={handleSignOut} className="sidebar-item logout-button">
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </aside>

        {/* Contenu */}
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


// Composant NavItem
interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

function NavItem({ to, icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
