import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { useKitchenContext } from '../../components/layouts/KitchenLayout';
import type { Order, OrderItem } from '../../types';

interface KitchenOrder extends Order {
  items: OrderItem[];
  elapsed_minutes: number;
}

export function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  let soundEnabled = true;
  try {
    const context = useKitchenContext();
    soundEnabled = context.soundEnabled;
  } catch {
    // Context non disponible, utiliser la valeur par défaut
  }

  // Jouer le son de notification
  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  // Charger les commandes
  const loadOrders = async () => {
    if (!supabase) {
      // Données démo
      setOrders([
        {
          id: 101,
          type: 'sur_place',
          status: 'en_preparation',
          total_amount: 15000,
          customer_name: 'Table 3',
          created_at: new Date(Date.now() - 10 * 60000).toISOString(),
          elapsed_minutes: 10,
          items: [
            { id: 1, order_id: 101, product_id: 1, quantity: 2, unit_price: 5000, line_total: 10000 },
            { id: 2, order_id: 101, product_id: 3, quantity: 1, unit_price: 5000, line_total: 5000 },
          ],
        },
        {
          id: 102,
          type: 'en_ligne',
          status: 'en_preparation',
          total_amount: 8500,
          customer_name: 'Jean D.',
          created_at: new Date(Date.now() - 5 * 60000).toISOString(),
          elapsed_minutes: 5,
          items: [
            { id: 3, order_id: 102, product_id: 2, quantity: 1, unit_price: 4500, line_total: 4500 },
            { id: 4, order_id: 102, product_id: 4, quantity: 2, unit_price: 2000, line_total: 4000 },
          ],
        },
        {
          id: 100,
          type: 'sur_place',
          status: 'prete',
          total_amount: 12000,
          customer_name: 'Table 1',
          created_at: new Date(Date.now() - 20 * 60000).toISOString(),
          elapsed_minutes: 20,
          items: [
            { id: 5, order_id: 100, product_id: 1, quantity: 2, unit_price: 5000, line_total: 10000 },
          ],
        },
      ]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (name),
          menus (name)
        ),
        restaurant_tables (name)
      `)
      .in('status', ['en_preparation', 'prete'])
      .order('created_at', { ascending: true });

    if (!error && data) {
      const ordersWithElapsed = data.map((order: any) => ({
        ...order,
        items: order.order_items,
        customer_name: order.restaurant_tables?.name || order.customer_name,
        elapsed_minutes: Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000),
      }));
      setOrders(ordersWithElapsed);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();

    // Mettre à jour le temps écoulé toutes les minutes
    const timer = setInterval(() => {
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          elapsed_minutes: Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000),
        }))
      );
    }, 60000);

    // Abonnement temps réel
    if (supabase) {
      const channel = supabase
        .channel('kitchen-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
            if (payload.eventType === 'INSERT') {
              playNotificationSound();
            }
            loadOrders();
          }
        )
        .subscribe();

      return () => {
        clearInterval(timer);
        supabase.removeChannel(channel);
      };
    }

    return () => clearInterval(timer);
  }, []);

  // Marquer comme prête
  const markAsReady = async (orderId: number) => {
    if (!supabase) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'prete' as const } : o))
      );
      return;
    }

    await supabase.from('orders').update({ status: 'prete' }).eq('id', orderId);
    loadOrders();
  };

  // Marquer comme livrée
  const markAsDelivered = async (orderId: number) => {
    if (!supabase) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      return;
    }

    await supabase.from('orders').update({ status: 'livree' }).eq('id', orderId);
    loadOrders();
  };

  // Séparer les commandes par statut
  const preparingOrders = orders.filter((o) => o.status === 'en_preparation');
  const readyOrders = orders.filter((o) => o.status === 'prete');

  const getTimeClass = (minutes: number) => {
    if (minutes > 20) return 'critical';
    if (minutes > 10) return 'warning';
    return 'normal';
  };

  if (loading) {
    return (
      <div className="kitchen-loading">
        <div className="loader" />
        <p>Chargement des commandes...</p>
      </div>
    );
  }

  return (
    <div className="kitchen-display">
      {/* Audio pour les notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="/notification.mp3" type="audio/mpeg" />
      </audio>

      {/* Section En Préparation */}
      <div className="kitchen-section preparing">
        <div className="section-header">
          <Clock size={24} />
          <h2>En Préparation</h2>
          <span className="count">{preparingOrders.length}</span>
        </div>

        <div className="orders-grid">
          {preparingOrders.length === 0 ? (
            <div className="no-orders">
              <p>Aucune commande en attente</p>
            </div>
          ) : (
            preparingOrders.map((order) => (
              <div key={order.id} className={`kitchen-order-card ${getTimeClass(order.elapsed_minutes)}`}>
                <div className="order-header">
                  <span className="order-number">#{order.id}</span>
                  <span className="order-type">{order.type === 'sur_place' ? 'Sur place' : 'En ligne'}</span>
                  <span className={`order-time ${getTimeClass(order.elapsed_minutes)}`}>
                    <Clock size={16} />
                    {order.elapsed_minutes} min
                  </span>
                </div>

                <div className="order-customer">
                  {order.customer_name || 'Client'}
                </div>

                <div className="order-items">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="order-item">
                      <span className="item-qty">{item.quantity}x</span>
                      <span className="item-name">
                        {(item as any).products?.name || (item as any).menus?.name || `Produit #${item.product_id || item.menu_id}`}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-ready"
                  onClick={() => markAsReady(order.id)}
                >
                  <CheckCircle size={20} />
                  Prête
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section Prêtes */}
      <div className="kitchen-section ready">
        <div className="section-header">
          <CheckCircle size={24} />
          <h2>Prêtes à servir</h2>
          <span className="count">{readyOrders.length}</span>
        </div>

        <div className="orders-grid">
          {readyOrders.length === 0 ? (
            <div className="no-orders">
              <p>Aucune commande prête</p>
            </div>
          ) : (
            readyOrders.map((order) => (
              <div key={order.id} className="kitchen-order-card ready">
                <div className="order-header">
                  <span className="order-number">#{order.id}</span>
                  <span className="order-type">{order.type === 'sur_place' ? 'Sur place' : 'En ligne'}</span>
                </div>

                <div className="order-customer">
                  {order.customer_name || 'Client'}
                </div>

                <div className="order-items">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="order-item">
                      <span className="item-qty">{item.quantity}x</span>
                      <span className="item-name">
                        {(item as any).products?.name || (item as any).menus?.name || `Produit #${item.product_id || item.menu_id}`}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-delivered"
                  onClick={() => markAsDelivered(order.id)}
                >
                  Livrée
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alerte si trop de commandes en attente */}
      {preparingOrders.some((o) => o.elapsed_minutes > 20) && (
        <div className="kitchen-alert">
          <AlertCircle size={24} />
          <span>Attention : certaines commandes attendent depuis plus de 20 minutes !</span>
        </div>
      )}
    </div>
  );
}
