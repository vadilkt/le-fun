import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../hooks/useCart';

export function CartPage() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="cart-empty">
        <ShoppingBag size={64} />
        <h2>Votre panier est vide</h2>
        <p>Ajoutez des plats délicieux à votre commande</p>
        <Link to="/customer" className="btn btn-primary">
          Voir le menu
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Votre panier</h1>
        <button className="btn btn-ghost" onClick={clearCart}>
          Vider le panier
        </button>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {items.map((item) => (
            <div key={`${item.type}-${item.id}`} className="cart-item">
              <div className="cart-item-image">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} />
                ) : (
                  <div className="placeholder-image">
                    <span>{item.name.charAt(0)}</span>
                  </div>
                )}
              </div>

              <div className="cart-item-details">
                <h3>{item.name}</h3>
                <span className="item-type">
                  {item.type === 'menu' ? 'Formule' : 'Produit'}
                </span>
                <span className="item-price">{item.price.toLocaleString()} FCFA</span>
              </div>

              <div className="cart-item-quantity">
                <button
                  className="qty-btn"
                  onClick={() => updateQuantity(item.type, item.id, item.quantity - 1)}
                >
                  <Minus size={16} />
                </button>
                <span className="qty-value">{item.quantity}</span>
                <button
                  className="qty-btn"
                  onClick={() => updateQuantity(item.type, item.id, item.quantity + 1)}
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="cart-item-total">
                <span>{(item.price * item.quantity).toLocaleString()} FCFA</span>
              </div>

              <button
                className="remove-btn"
                onClick={() => removeItem(item.type, item.id)}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="summary-card">
            <h3>Récapitulatif</h3>

            <div className="summary-lines">
              <div className="summary-line">
                <span>Sous-total</span>
                <span>{total.toLocaleString()} FCFA</span>
              </div>
              <div className="summary-line">
                <span>Frais de service</span>
                <span>0 FCFA</span>
              </div>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <span>{total.toLocaleString()} FCFA</span>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={() => navigate('/customer/checkout')}
            >
              Commander
              <ArrowRight size={18} />
            </button>

            <Link to="/customer" className="continue-shopping">
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
