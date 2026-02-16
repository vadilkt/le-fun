import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, ChefHat, Package } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Order, OrderStatus } from '../../types';

export function CustomerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les commandes
  useEffect(() => {
    const loadOrders = async () => {
      if (!supabase || !user) {
        // Données démo
        setOrders([
          {
            id: 1,
            type: 'en_ligne',
            status: 'en_preparation',
            total_amount: 12000,
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            type: 'sur_place',
            status: 'livree',
            total_amount: 8500,
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
      setLoading(false);
    };

    loadOrders();

    // Abonnement temps réel
    if (supabase && user) {
      const channel = supabase
        .channel('customer-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${user.id}`,
          },
          () => {
            loadOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'en_attente':
        return <Clock size={20} />;
      case 'en_preparation':
        return <ChefHat size={20} />;
      case 'prete':
        return <Package size={20} />;
      case 'livree':
        return <CheckCircle size={20} />;
      case 'annulee':
        return <XCircle size={20} />;
    }
  };

  const statusLabels: Record<OrderStatus, string> = {
    en_attente: 'En attente',
    en_preparation: 'En préparation',
    prete: 'Prête',
    livree: 'Livrée',
    annulee: 'Annulée',
  };

  const statusColors: Record<OrderStatus, string> = {
    en_attente: '#8b5cf6',
    en_preparation: '#f97316',
    prete: '#3b82f6',
    livree: '#16a34a',
    annulee: '#ef4444',
  };

  const typeLabels: Record<string, string> = {
    sur_place: 'Sur place',
    en_ligne: 'À emporter',
    livraison: 'Livraison',
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement de vos commandes..." />;
  }

  return (
    <div className="customer-orders-page">
      <div className="page-header">
        <h1>Mes commandes</h1>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <Clock size={64} />
          <h2>Aucune commande</h2>
          <p>Vous n'avez pas encore passé de commande</p>
          <Link to="/customer" className="btn btn-primary">
            Commander maintenant
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div className="order-info">
                  <span className="order-number">Commande #{order.id}</span>
                  <span className="order-date">
                    {new Date(order.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className="order-status"
                  style={{ backgroundColor: statusColors[order.status] + '20', color: statusColors[order.status] }}
                >
                  {getStatusIcon(order.status)}
                  <span>{statusLabels[order.status]}</span>
                </div>
              </div>

              <div className="order-card-body">
                <div className="order-details">
                  <span className="order-type">{typeLabels[order.type]}</span>
                  {order.table && <span className="order-table">{order.table.name}</span>}
                </div>
                <div className="order-total">
                  <span className="total-label">Total</span>
                  <span className="total-amount">{order.total_amount.toLocaleString()} FCFA</span>
                </div>
              </div>

              {/* Barre de progression pour les commandes en cours */}
              {(['en_attente', 'en_preparation', 'prete'] as OrderStatus[]).includes(order.status) && (
                <div className="order-progress">
                  <div className="progress-steps">
                    <div className="step completed">
                      <div className="step-dot" />
                      <span>En attente</span>
                    </div>
                    <div className={`step ${order.status === 'en_preparation' || order.status === 'prete' ? 'completed' : ''}`}>
                      <div className="step-dot" />
                      <span>En préparation</span>
                    </div>
                    <div className={`step ${order.status === 'prete' ? 'completed' : ''}`}>
                      <div className="step-dot" />
                      <span>Prête</span>
                    </div>
                    <div className="step">
                      <div className="step-dot" />
                      <span>Livrée</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
