import type { UserRole } from './roles';

// Re-export roles
export * from './roles';

// Profil utilisateur
export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  phone?: string | null;
  created_at?: string;
}

// Utilisateur authentifié
export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}

// Catégorie de produit
export interface Category {
  id: number;
  name: string;
}

// Produit
export interface Product {
  id: number;
  name: string;
  category_id: number | null;
  category?: Category | null;
  sale_price: number;
  cost_price: number;
  current_stock: number;
  min_stock: number;
  is_active: boolean;
  image_url?: string | null;
  description?: string | null;
}

// Menu / Formule
export interface Menu {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

// Item de menu (produits inclus)
export interface MenuItem {
  id: number;
  menu_id: number;
  product_id: number;
  quantity: number;
  product?: Product;
}

// Table du restaurant
export interface RestaurantTable {
  id: number;
  name: string;
}

// Statut de commande
export type OrderStatus = 'en_attente' | 'en_preparation' | 'prete' | 'livree' | 'annulee';

// Type de commande
export type OrderType = 'sur_place' | 'en_ligne' | 'livraison';

// Commande
export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  total_amount: number;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  table_id?: number | null;
  table?: RestaurantTable | null;
  created_at: string;
  items?: OrderItem[];
}

// Item de commande
export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number | null;
  menu_id?: number | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  product?: Product | null;
  menu?: Menu | null;
}

// Transaction comptable
export type TransactionType = 'vente' | 'achat' | 'autre';

export interface Transaction {
  id: number;
  type: TransactionType;
  label: string;
  amount: number;
  date: string;
}

// Labels de statut de commande
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: 'En attente',
  en_preparation: 'En préparation',
  prete: 'Prête',
  livree: 'Livrée',
  annulee: 'Annulée',
};

// Couleurs de statut de commande
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  en_attente: '#8b5cf6',
  en_preparation: '#f97316',
  prete: '#3b82f6',
  livree: '#16a34a',
  annulee: '#ef4444',
};

// Labels de type de commande
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  sur_place: 'Sur place',
  en_ligne: 'À emporter',
  livraison: 'Livraison',
};

// Item du panier (côté client)
export interface CartItem {
  type: 'product' | 'menu';
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

// État du panier
export interface CartState {
  items: CartItem[];
  total: number;
}
