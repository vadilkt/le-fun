import '../App.css';
import { Check, X, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type OrderStatus = 'en_preparation' | 'prete' | 'livree' | 'annulee';

type Order = {
  id: number;
  type: 'sur_place' | 'en_ligne';
  table?: string;
  customer?: string;
  total: number;
  status: OrderStatus;
};

type OrderNotification = {
  id: number;
  message: string;
};

type ProductOption = {
  id: number;
  name: string;
  price: number;
};

type NewOrderItem = {
  productId: number;
  quantity: number;
};

type NewOrderForm = {
  type: 'sur_place' | 'en_ligne';
  tableName: string;
  customerName: string;
  items: NewOrderItem[];
};

function statusLabel(status: OrderStatus) {
  switch (status) {
    case 'en_preparation':
      return 'En préparation';
    case 'prete':
      return 'Prête';
    case 'livree':
      return 'Livrée';
    case 'annulee':
      return 'Annulée';
  }
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newOrder, setNewOrder] = useState<NewOrderForm>({
    type: 'sur_place',
    tableName: '',
    customerName: '',
    items: [],
  });

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id,type,status,total_amount,customer_name,restaurant_tables(name)')
          .order('created_at', { ascending: false });
        if (error) throw error;

        if (!ignore) {
          setOrders(
            (data ?? []).map((o: any) => ({
              id: o.id,
              type: o.type,
              status: o.status,
              total: o.total_amount,
              customer: o.customer_name ?? undefined,
              table: o.restaurant_tables?.name ?? undefined,
            }))
          );
        }
      } catch (e: any) {
        if (!ignore) setError(e.message ?? 'Erreur lors du chargement des commandes');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    async function loadProducts() {
      setProductsLoading(true);
      if (!supabase) {
        setProductsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id,name,sale_price')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        if (!ignore) {
          setProducts(
            (data ?? []).map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.sale_price,
            }))
          );
        }
      } catch (e: any) {
        if (!ignore) setError(e.message ?? 'Erreur lors du chargement des produits');
      } finally {
        if (!ignore) setProductsLoading(false);
      }
    }

    load();
    loadProducts();

    if (supabase) {
      const channel = supabase
        .channel('orders-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
            if (ignore) return;

            const row: any = payload.new;
            if (!row) return;

            // Notification simple
            const msg =
              payload.eventType === 'INSERT'
                ? `Nouvelle commande #${row.id} (${row.type})`
                : `Commande #${row.id} mise à jour (${row.status})`;
            setNotifications((prev) => [
              { id: Date.now(), message: msg },
              ...prev.slice(0, 3),
            ]);

            // Rafraîchir la liste
            load();
          }
        )
        .subscribe();

      return () => {
        ignore = true;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      ignore = true;
    };
  }, []);

  const totalNewOrder = () => {
    return newOrder.items.reduce((sum, item) => {
      const p = products.find((pr) => pr.id === item.productId);
      if (!p) return sum;
      return sum + p.price * item.quantity;
    }, 0);
  };

  const addItemToNewOrder = (productId: number) => {
    setNewOrder((prev) => {
      const existing = prev.items.find((i) => i.productId === productId);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        ...prev,
        items: [...prev.items, { productId, quantity: 1 }],
      };
    });
  };

  const changeItemQuantity = (productId: number, quantity: number) => {
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items
        .map((i) => (i.productId === productId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0),
    }));
  };

  const resetForm = () => {
    setNewOrder({
      type: 'sur_place',
      tableName: '',
      customerName: '',
      items: [],
    });
  };

  const createOrder = async () => {
    if (!supabase) return;
    if (newOrder.items.length === 0) return;

    setError(null);

    try {
      const total = totalNewOrder();

      // Table associée (optionnelle)
      let tableId: number | null = null;
      if (newOrder.type === 'sur_place' && newOrder.tableName.trim()) {
        const { data: existing, error: tError } = await supabase
          .from('restaurant_tables')
          .select('id')
          .eq('name', newOrder.tableName.trim())
          .maybeSingle();
        if (tError) throw tError;
        if (existing) {
          tableId = existing.id;
        } else {
          const { data: created, error: cError } = await supabase
            .from('restaurant_tables')
            .insert({
              name: newOrder.tableName.trim(),
            })
            .select('id')
            .single();
          if (cError) throw cError;
          tableId = created.id;
        }
      }

      const { data: order, error: oError } = await supabase
        .from('orders')
        .insert({
          type: newOrder.type,
          table_id: tableId,
          customer_name:
            newOrder.type === 'en_ligne'
              ? newOrder.customerName || 'Client en ligne'
              : null,
          status: 'en_preparation',
          total_amount: total,
        })
        .select('id')
        .single();
      if (oError) throw oError;

      const orderId = order.id as number;

      // Lignes de commande
      const itemsPayload = newOrder.items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        const lineTotal = product.price * item.quantity;
        return {
          order_id: orderId,
          product_id: product.id,
          menu_id: null,
          quantity: item.quantity,
          unit_price: product.price,
          line_total: lineTotal,
        };
      });

      const { error: oiError } = await supabase
        .from('order_items')
        .insert(itemsPayload);
      if (oiError) throw oiError;

      // Mise à jour du stock + mouvements
      for (const item of newOrder.items) {
        const { error: stockError } = await supabase.rpc(
          'decrement_product_stock',
          {
            p_product_id: item.productId,
            p_quantity: item.quantity,
          }
        );
        if (stockError) {
          // Si la fonction n'existe pas, on ignore silencieusement
          if (!stockError.message.includes('function decrement_product_stock')) {
            throw stockError;
          }
        }
      }

      // Transaction de vente
      const { error: trError } = await supabase.from('transactions').insert({
        type: 'vente',
        label: `Commande #${orderId}`,
        amount: total,
      });
      if (trError) throw trError;

      // Rechargement rapide local
      setOrders((prev) => [
        {
          id: orderId,
          type: newOrder.type,
          status: 'en_preparation',
          total,
          customer:
            newOrder.type === 'en_ligne'
              ? newOrder.customerName || 'Client en ligne'
              : undefined,
          table:
            newOrder.type === 'sur_place' ? newOrder.tableName || undefined : undefined,
        },
        ...prev,
      ]);

      resetForm();
      setShowForm(false);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création de la commande');
    }
  };

  const advanceStatus = async (order: Order) => {
    if (!supabase) return;
    setError(null);

    const nextStatus: OrderStatus | null =
      order.status === 'en_preparation'
        ? 'prete'
        : order.status === 'prete'
        ? 'livree'
        : null;

    if (!nextStatus) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', order.id);
      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
      );
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la mise à jour de la commande');
    }
  };

  const cancelOrder = async (order: Order) => {
    if (!supabase) return;
    setError(null);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'annulee' })
        .eq('id', order.id);
      if (error) throw error;
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'annulee' } : o))
      );
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l’annulation de la commande');
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title">Commandes</h1>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setShowForm(true)}
        >
          <Clock size={16} />
          Nouvelle commande
        </button>
      </div>

      {notifications.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="section-header">
            <div className="section-title">Notifications commandes</div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setNotifications([])}
            >
              Effacer
            </button>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
            {notifications.map((n) => (
              <li key={n.id}>{n.message}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="muted" style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>
          {error}
        </p>
      )}

      {showForm && (
        <div className="login-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <div className="login-card" style={{ maxWidth: 620 }}>
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>
              Nouvelle commande
            </h2>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1.1fr 1fr' }}>
              <div>
                <div className="field">
                  <label>Type de commande</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={
                        'btn ' +
                        (newOrder.type === 'sur_place' ? 'btn-primary' : 'btn-ghost')
                      }
                      onClick={() =>
                        setNewOrder((prev) => ({ ...prev, type: 'sur_place' }))
                      }
                    >
                      Sur place
                    </button>
                    <button
                      type="button"
                      className={
                        'btn ' +
                        (newOrder.type === 'en_ligne' ? 'btn-primary' : 'btn-ghost')
                      }
                      onClick={() =>
                        setNewOrder((prev) => ({ ...prev, type: 'en_ligne' }))
                      }
                    >
                      En ligne
                    </button>
                  </div>
                </div>
                {newOrder.type === 'sur_place' ? (
                  <div className="field">
                    <label>Table</label>
                    <input
                      value={newOrder.tableName}
                      onChange={(e) =>
                        setNewOrder((prev) => ({
                          ...prev,
                          tableName: e.target.value,
                        }))
                      }
                      placeholder="Ex: T5, Terrasse 2..."
                    />
                  </div>
                ) : (
                  <div className="field">
                    <label>Nom du client</label>
                    <input
                      value={newOrder.customerName}
                      onChange={(e) =>
                        setNewOrder((prev) => ({
                          ...prev,
                          customerName: e.target.value,
                        }))
                      }
                      placeholder="Ex: Marie Dupont"
                    />
                  </div>
                )}

                <div className="field">
                  <label>Produits</label>
                  <div
                    style={{
                      maxHeight: 200,
                      overflowY: 'auto',
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      padding: '0.5rem',
                    }}
                  >
                    {productsLoading ? (
                      <p className="muted">Chargement des produits...</p>
                    ) : products.length === 0 ? (
                      <p className="muted">
                        Aucun produit actif. Configure d&apos;abord l&apos;inventaire.
                      </p>
                    ) : (
                      products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            width: '100%',
                            justifyContent: 'space-between',
                            marginBottom: '0.25rem',
                          }}
                          onClick={() => addItemToNewOrder(p.id)}
                        >
                          <span>{p.name}</span>
                          <span className="muted">
                            {p.price.toLocaleString('fr-FR')} FCFA
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="field">
                  <label>Détails de la commande</label>
                  <div
                    style={{
                      minHeight: 150,
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      padding: '0.75rem',
                    }}
                  >
                    {newOrder.items.length === 0 ? (
                      <p className="muted">
                        Sélectionne au moins un produit à gauche pour créer la
                        commande.
                      </p>
                    ) : (
                      newOrder.items.map((item) => {
                        const prod = products.find((p) => p.id === item.productId);
                        if (!prod) return null;
                        return (
                          <div
                            key={item.productId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '0.5rem',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.9rem' }}>{prod.name}</div>
                              <div className="muted" style={{ fontSize: '0.8rem' }}>
                                {prod.price.toLocaleString('fr-FR')} FCFA
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() =>
                                  changeItemQuantity(
                                    item.productId,
                                    Math.max(0, item.quantity - 1)
                                  )
                                }
                              >
                                -
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() =>
                                  changeItemQuantity(item.productId, item.quantity + 1)
                                }
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span className="section-title">Total</span>
                  <span style={{ fontWeight: 700 }}>
                    {totalNewOrder().toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={createOrder}
                    disabled={newOrder.items.length === 0}
                    style={{ flex: 1 }}
                  >
                    Créer commande
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    style={{ flex: 1 }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Client / Table</th>
            <th>Type</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && orders.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <span className="muted">Chargement des commandes...</span>
              </td>
            </tr>
          ) : (
            orders.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.type === 'sur_place' ? `Table ${o.table}` : o.customer}</td>
                <td>
                  <span className="pill">
                    {o.type === 'sur_place' ? 'Sur place' : 'En ligne'}
                  </span>
                </td>
                <td>{o.total.toLocaleString('fr-FR')} FCFA</td>
                <td>
                  <span className="status-pill">
                    <span
                      className="status-pill-dot"
                      style={{
                        background:
                          o.status === 'en_preparation'
                            ? '#f97316'
                            : o.status === 'prete'
                            ? '#3b82f6'
                            : o.status === 'livree'
                            ? '#16a34a'
                            : '#ef4444',
                      }}
                    />
                    {statusLabel(o.status)}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {o.status !== 'livree' && o.status !== 'annulee' && (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => advanceStatus(o)}
                      >
                        <Check size={14} />
                        Avancer
                      </button>
                    )}
                    {o.status !== 'livree' && o.status !== 'annulee' && (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => cancelOrder(o)}
                      >
                        <X size={14} />
                        Annuler
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

