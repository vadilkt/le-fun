import { DollarSign, ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export function DashboardPage() {
  const [todaySales, setTodaySales] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [totalRevenueMonth, setTotalRevenueMonth] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setError(null);

      if (!supabase) {
        // Données démo
        setTodaySales(125000);
        setActiveOrders(8);
        setLowStockItems(3);
        setTotalRevenueMonth(2850000);
        return;
      }

      try {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .slice(0, 10);

        const [
          { data: txToday, error: eToday },
          { data: txMonth, error: eMonth },
          { data: orders, error: eOrders },
          { data: products, error: eProducts },
        ] = await Promise.all([
          supabase
            .from('transactions')
            .select('amount')
            .eq('type', 'vente')
            .eq('date', todayStr),
          supabase
            .from('transactions')
            .select('amount')
            .eq('type', 'vente')
            .gte('date', monthStart),
          supabase
            .from('orders')
            .select('status')
            .in('status', ['en_preparation', 'prete']),
          supabase
            .from('products')
            .select('current_stock,min_stock'),
        ]);

        if (eToday || eMonth || eOrders || eProducts) {
          throw eToday || eMonth || eOrders || eProducts;
        }

        if (!ignore) {
          setTodaySales(
            (txToday ?? []).reduce((sum: number, t: any) => sum + t.amount, 0)
          );
          setTotalRevenueMonth(
            (txMonth ?? []).reduce((sum: number, t: any) => sum + t.amount, 0)
          );
          setActiveOrders((orders ?? []).length);
          setLowStockItems(
            (products ?? []).filter(
              (p: any) => p.current_stock <= p.min_stock
            ).length
          );
        }
      } catch (e: any) {
        if (!ignore) setError(e.message ?? 'Erreur lors du chargement du tableau de bord');
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div>
      <h1 className="page-title">Tableau de bord</h1>

      {error && (
        <p className="muted" style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>
          {error}
        </p>
      )}

      <div className="stats-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Ventes aujourd'hui</span>
            <DollarSign size={20} color="#22c55e" />
          </div>
          <div className="card-value">{todaySales.toLocaleString('fr-FR')} FCFA</div>
          <div className="muted">+12% vs hier</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Commandes actives</span>
            <ShoppingCart size={20} color="#3b82f6" />
          </div>
          <div className="card-value">{activeOrders}</div>
          <div className="muted">En préparation ou prêtes</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Articles en rupture bientôt</span>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div className="card-value">{lowStockItems}</div>
          <div className="muted">À commander rapidement</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Revenus du mois</span>
            <TrendingUp size={20} color="#8b5cf6" />
          </div>
          <div className="card-value">
            {totalRevenueMonth.toLocaleString('fr-FR')} FCFA
          </div>
          <div className="muted">Objectif: 5 000 000 FCFA</div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Vue rapide</div>
            <p className="muted">
              Aperçu des commandes récentes, du stock et des chiffres clés pour Le Fun.
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#4b5563' }}>
          Les modules <span className="pill">Commandes</span>,{' '}
          <span className="pill">Inventaire</span> et{' '}
          <span className="pill">Comptabilité</span> sont disponibles via le menu latéral.
        </p>
      </div>
    </div>
  );
}
