-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des menus/formules
CREATE TABLE IF NOT EXISTS menus (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des items de menu
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1
);

-- Table des tables du restaurant
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des profils utilisateurs (étend auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'cuisinier', 'serveur', 'caissier', 'manager', 'admin')),
  is_active BOOLEAN DEFAULT true,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sur_place', 'en_ligne')),
  status VARCHAR(20) NOT NULL DEFAULT 'en_preparation' CHECK (status IN ('en_preparation', 'prete', 'livree', 'annulee')),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des items de commande
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  menu_id INTEGER REFERENCES menus(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('vente', 'achat', 'autre')),
  label VARCHAR(255) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. MISE À JOUR DES TABLES EXISTANTES
-- ============================================

-- Ajouter customer_id si manquant
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Ajouter customer_phone aux commandes (livraison)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);

-- Ajouter les nouvelles valeurs aux enums (si ce sont des types ENUM PostgreSQL)
DO $$
BEGIN
  -- Ajouter 'en_attente' au statut si pas déjà présent
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'en_attente' BEFORE 'en_preparation';
  END IF;
  -- Ajouter 'livraison' au type de commande si pas déjà présent
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
    ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'livraison';
  END IF;
END $$;

-- Mettre à jour la contrainte CHECK de statut (si VARCHAR avec CHECK)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status::text IN ('en_attente', 'en_preparation', 'prete', 'livree', 'annulee'));

-- Mettre à jour la contrainte CHECK de type (si VARCHAR avec CHECK)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_type_check
  CHECK (type::text IN ('sur_place', 'en_ligne', 'livraison'));

-- Ajouter colonnes aux profils si manquantes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ajouter colonnes aux produits si manquantes
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Ajouter colonnes aux menus si manquantes
ALTER TABLE menus ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================
-- 3. FONCTIONS HELPER POUR RLS
-- ============================================

-- Obtenir le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()),
    ''
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur est du personnel
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('serveur', 'caissier', 'manager', 'admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur est cuisinier ou supérieur
CREATE OR REPLACE FUNCTION is_kitchen_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('cuisinier', 'manager', 'admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur est manager ou admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('manager', 'admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur est client
CREATE OR REPLACE FUNCTION is_client()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'client';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- 4. FONCTION POUR DÉCRÉMENTER LE STOCK
-- ============================================

CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id INTEGER, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET current_stock = current_stock - p_quantity
  WHERE id = p_product_id AND current_stock >= p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. TRIGGER POUR CRÉER LE PROFIL À L'INSCRIPTION
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, is_active, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    true,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe et le recréer
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 6. ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. POLITIQUES RLS - PROFILES
-- ============================================

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Staff can read all profiles" ON profiles;
CREATE POLICY "Staff can read all profiles" ON profiles
  FOR SELECT USING (is_staff() OR is_kitchen_staff());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admin can manage profiles" ON profiles;
CREATE POLICY "Admin can manage profiles" ON profiles
  FOR ALL USING (is_admin());

-- ============================================
-- 8. POLITIQUES RLS - PRODUCTS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true OR is_staff() OR is_admin());

DROP POLICY IF EXISTS "Admin can manage products" ON products;
CREATE POLICY "Admin can manage products" ON products
  FOR ALL USING (is_admin());

-- ============================================
-- 9. POLITIQUES RLS - CATEGORIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage categories" ON categories;
CREATE POLICY "Admin can manage categories" ON categories
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update categories" ON categories;
CREATE POLICY "Admin can update categories" ON categories
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete categories" ON categories;
CREATE POLICY "Admin can delete categories" ON categories
  FOR DELETE USING (is_admin());

-- ============================================
-- 10. POLITIQUES RLS - MENUS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view active menus" ON menus;
CREATE POLICY "Anyone can view active menus" ON menus
  FOR SELECT USING (is_active = true OR is_manager_or_admin());

DROP POLICY IF EXISTS "Manager can manage menus" ON menus;
CREATE POLICY "Manager can manage menus" ON menus
  FOR ALL USING (is_manager_or_admin());

-- ============================================
-- 11. POLITIQUES RLS - MENU_ITEMS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view menu_items" ON menu_items;
CREATE POLICY "Anyone can view menu_items" ON menu_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manager can manage menu_items" ON menu_items;
CREATE POLICY "Manager can manage menu_items" ON menu_items
  FOR ALL USING (is_manager_or_admin());

-- ============================================
-- 12. POLITIQUES RLS - ORDERS
-- ============================================

DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
CREATE POLICY "Staff can view all orders" ON orders
  FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS "Kitchen can view orders to prepare" ON orders;
CREATE POLICY "Kitchen can view orders to prepare" ON orders
  FOR SELECT USING (is_kitchen_staff() AND status IN ('en_preparation', 'prete'));

DROP POLICY IF EXISTS "Customers can create own orders" ON orders;
CREATE POLICY "Customers can create own orders" ON orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Staff can create orders" ON orders;
CREATE POLICY "Staff can create orders" ON orders
  FOR INSERT WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Staff can update orders" ON orders;
CREATE POLICY "Staff can update orders" ON orders
  FOR UPDATE USING (is_staff());

DROP POLICY IF EXISTS "Kitchen can mark orders ready" ON orders;
CREATE POLICY "Kitchen can mark orders ready" ON orders
  FOR UPDATE USING (is_kitchen_staff());

DROP POLICY IF EXISTS "Admin can delete orders" ON orders;
CREATE POLICY "Admin can delete orders" ON orders
  FOR DELETE USING (is_admin());

-- ============================================
-- 13. POLITIQUES RLS - ORDER_ITEMS
-- ============================================

DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;
CREATE POLICY "Customers can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all order items" ON order_items;
CREATE POLICY "Staff can view all order items" ON order_items
  FOR SELECT USING (is_staff() OR is_kitchen_staff());

DROP POLICY IF EXISTS "Customers can insert own order items" ON order_items;
CREATE POLICY "Customers can insert own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can insert order items" ON order_items;
CREATE POLICY "Staff can insert order items" ON order_items
  FOR INSERT WITH CHECK (is_staff());

-- ============================================
-- 14. POLITIQUES RLS - RESTAURANT_TABLES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view tables" ON restaurant_tables;
CREATE POLICY "Anyone can view tables" ON restaurant_tables
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manager can manage tables" ON restaurant_tables;
CREATE POLICY "Manager can manage tables" ON restaurant_tables
  FOR ALL USING (is_manager_or_admin());

-- ============================================
-- 15. POLITIQUES RLS - TRANSACTIONS
-- ============================================

DROP POLICY IF EXISTS "Manager can view transactions" ON transactions;
CREATE POLICY "Manager can view transactions" ON transactions
  FOR SELECT USING (is_manager_or_admin());

DROP POLICY IF EXISTS "Staff can insert sales" ON transactions;
CREATE POLICY "Staff can insert sales" ON transactions
  FOR INSERT WITH CHECK (is_staff() AND type = 'vente');

DROP POLICY IF EXISTS "Admin can manage transactions" ON transactions;
CREATE POLICY "Admin can manage transactions" ON transactions
  FOR ALL USING (is_admin());

-- ============================================
-- 16. ACTIVER REALTIME POUR LES COMMANDES
-- ============================================

-- S'assurer que la table orders est dans la publication realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

-- ============================================
-- 17. INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- 18. DONNÉES INITIALES (OPTIONNEL)
-- ============================================

-- Insérer quelques catégories par défaut
INSERT INTO categories (name) VALUES
  ('Entrées'),
  ('Plats principaux'),
  ('Desserts'),
  ('Boissons'),
  ('Accompagnements')
ON CONFLICT (name) DO NOTHING;

-- Insérer quelques tables par défaut
INSERT INTO restaurant_tables (name) VALUES
  ('Table 1'),
  ('Table 2'),
  ('Table 3'),
  ('Table 4'),
  ('Table 5'),
  ('Terrasse 1'),
  ('Terrasse 2')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
-- N'oubliez pas de créer un utilisateur admin initial :
-- 1. Créez un compte via l'interface d'inscription
-- 2. Puis exécutez :
-- UPDATE profiles SET role = 'admin' WHERE id = 'UUID_DE_LUTILISATEUR';
-- ============================================
