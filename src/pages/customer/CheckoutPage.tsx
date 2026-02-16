import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Home, Truck, ArrowLeft, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { RestaurantTable, OrderType } from '../../types';

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState<OrderType>('en_ligne');
  const [tableId, setTableId] = useState<number | null>(null);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  // Charger les tables
  useEffect(() => {
    const loadTables = async () => {
      if (!supabase) {
        setTables([
          { id: 1, name: 'Table 1' },
          { id: 2, name: 'Table 2' },
          { id: 3, name: 'Table 3' },
          { id: 4, name: 'Table 4' },
          { id: 5, name: 'Table 5' },
        ]);
        setTablesLoading(false);
        return;
      }

      const { data } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('name');

      setTables(data || []);
      setTablesLoading(false);
    };

    loadTables();
  }, []);

  // Rediriger si panier vide
  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      navigate('/customer/cart');
    }
  }, [items, navigate, orderPlaced]);

  const handlePlaceOrder = async () => {
    setError(null);

    // Validation
    if (orderType === 'sur_place' && !tableId) {
      setError('Veuillez sélectionner une table');
      return;
    }
    if (orderType === 'livraison' && !phone.trim()) {
      setError('Veuillez indiquer un numéro de téléphone pour la livraison');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        // Mode démo
        const demoId = Math.floor(Math.random() * 1000);
        setOrderId(demoId);
        setOrderPlaced(true);
        clearCart();
        setLoading(false);
        return;
      }

      // Créer la commande avec statut en_attente
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          type: orderType,
          status: 'en_attente',
          total_amount: total,
          customer_id: user?.id,
          customer_name: profile?.full_name,
          customer_phone: orderType === 'livraison' ? phone.trim() : null,
          table_id: orderType === 'sur_place' ? tableId : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Créer les items de commande
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.type === 'product' ? item.id : null,
        menu_id: item.type === 'menu' ? item.id : null,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Commande enregistrée — le client n'attend plus rien
      setOrderId(order.id);
      setOrderPlaced(true);
      clearCart();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  };

  // Confirmation de commande
  if (orderPlaced) {
    return (
      <div className="checkout-success">
        <div className="success-card">
          <CheckCircle size={64} className="success-icon" />
          <h1>Commande envoyée !</h1>
          <p className="order-number">Commande #{orderId}</p>
          <p className="success-message">
            {orderType === 'sur_place'
              ? 'Votre commande est en attente de validation. Elle sera servie à votre table.'
              : orderType === 'livraison'
              ? 'Votre commande est en attente de validation. Vous serez livré dès confirmation.'
              : 'Votre commande est en attente de validation. Vous pourrez la récupérer sur place.'}
          </p>
          <div className="success-actions">
            <Link to="/customer/orders" className="btn btn-primary">
              Suivre ma commande
            </Link>
            <Link to="/customer" className="btn btn-ghost">
              Retour au menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link to="/customer/cart" className="back-link">
          <ArrowLeft size={20} />
          Retour au panier
        </Link>
        <h1>Finaliser la commande</h1>
      </div>

      <div className="checkout-content">
        <div className="checkout-form">
          {/* Type de commande */}
          <div className="checkout-section">
            <h2>Type de commande</h2>
            <div className="order-type-options">
              <label className={`order-type-option ${orderType === 'en_ligne' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="orderType"
                  value="en_ligne"
                  checked={orderType === 'en_ligne'}
                  onChange={() => setOrderType('en_ligne')}
                />
                <div className="option-content">
                  <Home size={24} />
                  <div>
                    <span className="option-title">À emporter</span>
                    <span className="option-desc">Récupérez votre commande sur place</span>
                  </div>
                </div>
              </label>

              <label className={`order-type-option ${orderType === 'livraison' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="orderType"
                  value="livraison"
                  checked={orderType === 'livraison'}
                  onChange={() => setOrderType('livraison')}
                />
                <div className="option-content">
                  <Truck size={24} />
                  <div>
                    <span className="option-title">Livraison</span>
                    <span className="option-desc">Recevez votre commande à domicile</span>
                  </div>
                </div>
              </label>

              <label className={`order-type-option ${orderType === 'sur_place' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="orderType"
                  value="sur_place"
                  checked={orderType === 'sur_place'}
                  onChange={() => setOrderType('sur_place')}
                />
                <div className="option-content">
                  <MapPin size={24} />
                  <div>
                    <span className="option-title">Sur place</span>
                    <span className="option-desc">Mangez au restaurant</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Téléphone (livraison) */}
          {orderType === 'livraison' && (
            <div className="checkout-section">
              <h2>Numéro de téléphone</h2>
              <div className="field">
                <div className="input-with-icon">
                  <Phone size={18} className="input-icon" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sélection de table (sur place) */}
          {orderType === 'sur_place' && (
            <div className="checkout-section">
              <h2>Choisir une table</h2>
              {tablesLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <div className="table-grid">
                  {tables.map((table) => (
                    <button
                      key={table.id}
                      className={`table-option ${tableId === table.id ? 'selected' : ''}`}
                      onClick={() => setTableId(table.id)}
                    >
                      {table.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Informations client */}
          <div className="checkout-section">
            <h2>Vos informations</h2>
            <div className="customer-info">
              <p><strong>Nom :</strong> {profile?.full_name}</p>
              {profile?.phone && orderType !== 'livraison' && (
                <p><strong>Téléphone :</strong> {profile.phone}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Récapitulatif */}
        <div className="checkout-summary">
          <div className="summary-card">
            <h3>Votre commande</h3>

            <div className="summary-items">
              {items.map((item) => (
                <div key={`${item.type}-${item.id}`} className="summary-item">
                  <span className="item-qty">{item.quantity}x</span>
                  <span className="item-name">{item.name}</span>
                  <span className="item-price">
                    {(item.price * item.quantity).toLocaleString()} FCFA
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-total">
              <span>Total à payer</span>
              <span>{total.toLocaleString()} FCFA</span>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handlePlaceOrder}
              disabled={loading}
            >
              {loading ? 'Envoi...' : 'Confirmer la commande'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
