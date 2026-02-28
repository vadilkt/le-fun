import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import type { CartItem } from '../types';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (type: 'product' | 'menu', id: number) => void;
  updateQuantity: (type: 'product' | 'menu', id: number, quantity: number) => void;
  clearCart: () => void;
  getItem: (type: 'product' | 'menu', id: number) => CartItem | undefined;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = 'lefun_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Charger depuis localStorage
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Calculer le nombre total d'items
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Calculer le total
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Ajouter un item
  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.type === newItem.type && item.id === newItem.id
      );

      if (existingIndex >= 0) {
        // Incrémenter la quantité
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      // Ajouter nouvel item
      return [...prev, { ...newItem, quantity: 1 }];
    });
  };

  // Supprimer un item
  const removeItem = (type: 'product' | 'menu', id: number) => {
    setItems((prev) => prev.filter((item) => !(item.type === type && item.id === id)));
  };

  // Modifier la quantité
  const updateQuantity = (type: 'product' | 'menu', id: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(type, id);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.type === type && item.id === id ? { ...item, quantity } : item
      )
    );
  };

  // Vider le panier
  const clearCart = () => {
    setItems([]);
  };

  // Obtenir un item
  const getItem = (type: 'product' | 'menu', id: number) => {
    return items.find((item) => item.type === type && item.id === id);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        total,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart doit être utilisé dans un CartProvider');
  }
  return context;
}
