import { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, ChefHat, Package, X, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import type { Order, OrderStatus, Product, Menu, RestaurantTable } from '../../types';
import { OrdersService, type CreateOrderDTO } from '../../services/orders.service';
import { ProductsService } from '../../services/products.service';

interface OrderWithDetails extends Order {
  items?: any[];
}

export function StaffOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('en_attente');
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // État du formulaire de nouvelle commande
  const [newOrder, setNewOrder] = useState<CreateOrderDTO>({
    type: 'sur_place',
    tableId: null,
    customerName: '',
    items: [],
  });

  // Charger les données
  const loadData = async () => {
    try {
      if (!supabase) {
        // Mode démo si pas de Supabase
        setLoading(false);
        return;
      }

      const [fetchedOrders, fetchedProducts, fetchedMenus, fetchedTables] = await Promise.all([
        OrdersService.getOrders(),
        ProductsService.getActiveProducts(),
        ProductsService.getActiveMenus(),
        ProductsService.getTables(),
      ]);

      setOrders(fetchedOrders);
      setProducts(fetchedProducts);
      setMenus(fetchedMenus);
      setTables(fetchedTables);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setPageError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Abonnement Realtime via le service
    const unsubscribe = OrdersService.subscribeToOrders(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Changer le statut d'une commande (avec mise à jour optimiste)
  const updateStatus = async (orderId: number, newStatus: OrderStatus) => {
    setProcessingOrderId(orderId);
    setPageError(null);
    const oldStatus = orders.find((o) => o.id === orderId)?.status;

    // Mise à jour optimiste immédiate
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

    try {
      await OrdersService.updateStatus(orderId, newStatus);
    } catch (err: any) {
      // Annuler la mise à jour optimiste
      if (oldStatus) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: oldStatus } : o)));
      }
      setPageError(`Erreur : ${err.message || 'Impossible de mettre à jour le statut'}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Valider une commande en_attente → en_preparation + stock + transaction
  const validateOrder = async (order: OrderWithDetails) => {
    setProcessingOrderId(order.id);
    setPageError(null);

    // Mise à jour optimiste
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: 'en_preparation' as OrderStatus } : o))
    );
    setStatusFilter('en_preparation');

    try {
      await OrdersService.validateOrder(order.id, order.total_amount, order.items || []);
    } catch (err: any) {
      // Annuler optimiste
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'en_attente' as OrderStatus } : o))
      );
      setStatusFilter('en_attente');
      setPageError(`Erreur validation commande #${order.id} : ${err.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Ajouter un item à la nouvelle commande
  const addItemToOrder = (type: 'product' | 'menu', item: Product | Menu) => {
    const existing = newOrder.items.find((i) => i.type === type && i.id === item.id);
    if (existing) {
      setNewOrder({
        ...newOrder,
        items: newOrder.items.map((i) =>
          i.type === type && i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      setNewOrder({
        ...newOrder,
        items: [
          ...newOrder.items,
          {
            type,
            id: item.id,
            // @ts-ignore - dynamic property access
            name: item.name,
            price: type === 'product' ? (item as Product).sale_price : (item as Menu).price,
            quantity: 1,
          },
        ],
      });
    }
  };

  // Supprimer un item
  const removeItemFromOrder = (type: 'product' | 'menu', id: number) => {
    setNewOrder({
      ...newOrder,
      items: newOrder.items.filter((i) => !(i.type === type && i.id === id)),
    });
  };

  // Calculer le total
  const orderTotal = newOrder.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Créer la commande
  const createOrder = async () => {
    if (newOrder.items.length === 0) return;
    if (newOrder.type === 'sur_place' && !newOrder.tableId) return;

    try {
      await OrdersService.createOrder(newOrder, orderTotal);
      resetForm();
      // Le realtime mettra à jour la liste, ou on recharge manuellement
      loadData();
    } catch (err: any) {
      console.error('Erreur création commande:', err);
      setPageError('Erreur lors de la création de la commande: ' + err.message);
    }
  };

  const resetForm = () => {
    setNewOrder({
      type: 'sur_place',
      tableId: null,
      customerName: '',
      items: [],
    });
    setShowModal(false);
  };

  // Filtrer les commandes
  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

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

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'en_attente': return <Clock size={16} />;
      case 'en_preparation': return <ChefHat size={16} />;
      case 'prete': return <Package size={16} />;
      case 'livree': return <CheckCircle size={16} />;
      case 'annulee': return <XCircle size={16} />;
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement des commandes..." />;
  }

  const countByStatus = (status: OrderStatus) => orders.filter((o) => o.status === status).length;

  return (
    <div className="staff-orders-page">
      <div className="section-header">
        <h1 className="page-title">Commandes</h1>
        <Button onClick={() => setShowModal(true)} leftIcon={<Plus size={18} />}>
          Nouvelle commande
        </Button>
      </div>

      {/* Erreur globale */}
      {pageError && (
        <div className="error-message" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--error)' }}>
          <XCircle size={16} />
          <span>{pageError}</span>
          <button
            onClick={() => setPageError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="filters">
        <button
          className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          Toutes ({orders.length})
        </button>
        <button
          className={`filter-btn ${statusFilter === 'en_attente' ? 'active' : ''}`}
          onClick={() => setStatusFilter('en_attente')}
        >
          En attente {countByStatus('en_attente') > 0 && <span className="badge">{countByStatus('en_attente')}</span>}
        </button>
        <button
          className={`filter-btn ${statusFilter === 'en_preparation' ? 'active' : ''}`}
          onClick={() => setStatusFilter('en_preparation')}
        >
          En préparation {countByStatus('en_preparation') > 0 && <span className="badge">{countByStatus('en_preparation')}</span>}
        </button>
        <button
          className={`filter-btn ${statusFilter === 'prete' ? 'active' : ''}`}
          onClick={() => setStatusFilter('prete')}
        >
          Prêtes {countByStatus('prete') > 0 && <span className="badge">{countByStatus('prete')}</span>}
        </button>
        <button
          className={`filter-btn ${statusFilter === 'livree' ? 'active' : ''}`}
          onClick={() => setStatusFilter('livree')}
        >
          Livrées
        </button>
      </div>

      {/* Liste des commandes */}
      <div className="orders-table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Client / Table</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Heure</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td><strong>{order.id}</strong></td>
                <td>{typeLabels[order.type] || order.type}</td>
                <td>
                  <div>
                    <span>{order.customer_name || '-'}</span>
                    {order.type === 'livraison' && order.customer_phone && (
                      <div style={{ fontSize: '0.8em', color: '#666' }}>{order.customer_phone}</div>
                    )}
                  </div>
                </td>
                <td>{order.total_amount.toLocaleString()} FCFA</td>
                <td>
                  <span
                    className="status-pill"
                    style={{ backgroundColor: statusColors[order.status] + '20', color: statusColors[order.status] }}
                  >
                    {getStatusIcon(order.status)}
                    {statusLabels[order.status]}
                  </span>
                </td>
                <td>
                  {new Date(order.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td>
                  <div className="action-buttons">
                    {order.status === 'en_attente' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => validateOrder(order)}
                        isLoading={processingOrderId === order.id}
                      >
                        Valider
                      </Button>
                    )}
                    {order.status === 'en_preparation' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatus(order.id, 'prete')}
                        isLoading={processingOrderId === order.id}
                      >
                        Prête
                      </Button>
                    )}
                    {order.status === 'prete' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => updateStatus(order.id, 'livree')}
                        isLoading={processingOrderId === order.id}
                      >
                        Livrée
                      </Button>
                    )}
                    {(order.status === 'en_attente' || order.status === 'en_preparation' || order.status === 'prete') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(order.id, 'annulee')}
                        isLoading={processingOrderId === order.id}
                        style={{ color: 'var(--error)' }}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <p className="no-data">Aucune commande trouvée</p>
        )}
      </div>

      {/* Modal nouvelle commande */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle commande</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="order-form-grid">
                {/* Colonne gauche : sélection produits */}
                <div className="products-selection">
                  <h3>Produits</h3>
                  <div className="items-list">
                    {products.map((p) => (
                      <button
                        key={`p-${p.id}`}
                        className="item-btn"
                        onClick={() => addItemToOrder('product', p)}
                      >
                        <span>{p.name}</span>
                        <span className="price">{p.sale_price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>

                  <h3>Formules</h3>
                  <div className="items-list">
                    {menus.map((m) => (
                      <button
                        key={`m-${m.id}`}
                        className="item-btn menu"
                        onClick={() => addItemToOrder('menu', m)}
                      >
                        <span>{m.name}</span>
                        <span className="price">{m.price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colonne droite : récapitulatif */}
                <div className="order-summary">
                  <div className="field">
                    <label>Type de commande</label>
                    <div className="type-toggle">
                      <button
                        className={newOrder.type === 'sur_place' ? 'active' : ''}
                        onClick={() => setNewOrder({ ...newOrder, type: 'sur_place' })}
                      >
                        Sur place
                      </button>
                      <button
                        className={newOrder.type === 'en_ligne' ? 'active' : ''}
                        onClick={() => setNewOrder({ ...newOrder, type: 'en_ligne' })}
                      >
                        En ligne
                      </button>
                    </div>
                  </div>

                  {newOrder.type === 'sur_place' ? (
                    <div className="field">
                      <label>Table</label>
                      <select
                        value={newOrder.tableId || ''}
                        onChange={(e) => setNewOrder({ ...newOrder, tableId: Number(e.target.value) || null })}
                      >
                        <option value="">Sélectionner...</option>
                        {tables.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="field">
                      <label>Nom du client</label>
                      <input
                        type="text"
                        value={newOrder.customerName}
                        onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                        placeholder="Nom du client"
                      />
                    </div>
                  )}

                  <h3>Articles ({newOrder.items.length})</h3>
                  <div className="order-items-list">
                    {newOrder.items.length === 0 ? (
                      <p className="muted">Aucun article</p>
                    ) : (
                      newOrder.items.map((item) => (
                        <div key={`${item.type}-${item.id}`} className="order-item-row">
                          <span className="qty">{item.quantity}x</span>
// @ts-ignore - dynamic name
                          <span className="name">{(item as any).name || 'Article'}</span>
                          <span className="price">{(item.price * item.quantity).toLocaleString()}</span>
                          <button
                            className="remove-btn"
                            onClick={() => removeItemFromOrder(item.type, item.id)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="order-total">
                    <span>Total</span>
                    <span>{orderTotal.toLocaleString()} FCFA</span>
                  </div>

                  <Button
                    fullWidth
                    onClick={createOrder}
                    disabled={newOrder.items.length === 0 || (newOrder.type === 'sur_place' && !newOrder.tableId)}
                  >
                    Créer la commande
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
