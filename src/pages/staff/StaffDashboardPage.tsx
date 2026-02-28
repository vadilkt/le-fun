import { useState, useEffect } from 'react';
import { ShoppingBag, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface DashboardStats {
  todayOrders: number;
  activeOrders: number;
  completedToday: number;
  todayRevenue: number;
}

export function StaffDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    activeOrders: 0,
    completedToday: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!supabase) {
        // Données démo
        setStats({
          todayOrders: 24,
          activeOrders: 5,
          completedToday: 19,
          todayRevenue: 185000,
        });
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      try {
        // Commandes du jour
        const { data: todayOrdersData } = await supabase
          .from('orders')
          .select('id, status, total_amount')
          .gte('created_at', today);

        const orders = todayOrdersData || [];
        const activeOrders = orders.filter(
          (o: { status: string }) => o.status === 'en_preparation' || o.status === 'prete'
        ).length;
        const completedToday = orders.filter((o: { status: string }) => o.status === 'livree').length;
        const todayRevenue = orders
          .filter((o: { status: string }) => o.status === 'livree')
          .reduce((sum: number, o: { total_amount?: number }) => sum + (o.total_amount || 0), 0);

        setStats({
          todayOrders: orders.length,
          activeOrders,
          completedToday,
          todayRevenue,
        });
      } catch (err) {
        console.error('Erreur chargement stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  return (
    <div className="staff-dashboard">
      <h1 className="page-title">Tableau de bord</h1>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}>
            <ShoppingBag size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.todayOrders}</span>
            <span className="stat-label">Commandes aujourd'hui</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f9731620', color: '#f97316' }}>
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.activeOrders}</span>
            <span className="stat-label">Commandes actives</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#16a34a20', color: '#16a34a' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.completedToday}</span>
            <span className="stat-label">Livrées aujourd'hui</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.todayRevenue.toLocaleString()}</span>
            <span className="stat-label">Revenus du jour (FCFA)</span>
          </div>
        </div>
      </div>

      <div className="dashboard-info">
        <p className="muted">
          Les statistiques se mettent à jour automatiquement toutes les 30 secondes.
        </p>
      </div>
    </div>
  );
}
