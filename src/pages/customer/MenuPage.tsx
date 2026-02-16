import { useState, useEffect } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useCart } from '../../hooks/useCart';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import type { Product, Menu, Category } from '../../types';
import { ProductsService } from '../../services/products.service';

export function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'menus'>('products');

  const { addItem, getItem } = useCart();

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      if (!supabase) {
        // Données démo (mode hors ligne / démo)
        setProducts([
          { id: 1, name: 'Poulet DG', sale_price: 5000, category_id: 2, cost_price: 2500, current_stock: 10, min_stock: 5, is_active: true },
          { id: 2, name: 'Ndolé', sale_price: 4500, category_id: 2, cost_price: 2000, current_stock: 8, min_stock: 5, is_active: true },
          { id: 3, name: 'Plantains frits', sale_price: 1500, category_id: 5, cost_price: 500, current_stock: 20, min_stock: 10, is_active: true },
          { id: 4, name: 'Jus de gingembre', sale_price: 1000, category_id: 4, cost_price: 300, current_stock: 15, min_stock: 5, is_active: true },
        ]);
        setMenus([
          { id: 1, name: 'Menu Découverte', price: 8000, description: 'Entrée + Plat + Dessert' },
          { id: 2, name: 'Menu Express', price: 5500, description: 'Plat + Boisson' },
        ]);
        setCategories([
          { id: 1, name: 'Entrées' },
          { id: 2, name: 'Plats principaux' },
          { id: 3, name: 'Desserts' },
          { id: 4, name: 'Boissons' },
          { id: 5, name: 'Accompagnements' },
        ]);
        setLoading(false);
        return;
      }

      try {
        const [fetchedProducts, fetchedMenus, fetchedCategories] = await Promise.all([
          ProductsService.getActiveProducts(),
          ProductsService.getActiveMenus(),
          ProductsService.getCategories(),
        ]);

        setProducts(fetchedProducts);
        setMenus(fetchedMenus);
        setCategories(fetchedCategories);
      } catch (err) {
        console.error('Erreur chargement menu:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filtrer les produits
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtrer les menus
  const filteredMenus = menus.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProduct = (product: Product) => {
    addItem({
      type: 'product',
      id: product.id,
      name: product.name,
      price: product.sale_price,
    });
  };

  const handleAddMenu = (menu: Menu) => {
    addItem({
      type: 'menu',
      id: menu.id,
      name: menu.name,
      price: menu.price,
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement du menu..." />;
  }

  return (
    <div className="menu-page">
      <div className="menu-hero">
        <h1>Notre Menu</h1>
        <p>Découvrez nos délicieux plats camerounais</p>
      </div>

      {/* Barre de recherche */}
      <div className="menu-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Rechercher un plat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Onglets */}
      <div className="menu-tabs">
        <Button
          variant={activeTab === 'products' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('products')}
        >
          À la carte
        </Button>
        <Button
          variant={activeTab === 'menus' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('menus')}
          style={{ marginLeft: '0.5rem' }}
        >
          Formules
        </Button>
      </div>

      {/* Catégories (seulement pour les produits) */}
      {activeTab === 'products' && (
        <div className="category-filters">
          <Button
            size="sm"
            variant={selectedCategory === null ? 'primary' : 'outline'}
            onClick={() => setSelectedCategory(null)}
          >
            Tout
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={selectedCategory === cat.id ? 'primary' : 'outline'}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      )}

      {/* Grille des items */}
      <div className="menu-grid">
        {activeTab === 'products' ? (
          filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const inCart = getItem('product', product.id);
              return (
                <div key={product.id} className="menu-card">
                  <div className="menu-card-image">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} />
                    ) : (
                      <div className="placeholder-image">
                        <span>{product.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="menu-card-content">
                    <h3>{product.name}</h3>
                    {product.description && <p className="description">{product.description}</p>}
                    <div className="menu-card-footer">
                      <span className="price">{product.sale_price.toLocaleString()} FCFA</span>
                      <Button
                        size="sm"
                        variant={inCart ? 'secondary' : 'primary'}
                        onClick={() => handleAddProduct(product)}
                        leftIcon={inCart ? <Check size={18} /> : <Plus size={18} />}
                      >
                        {inCart ? inCart.quantity : 'Ajouter'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="no-results">Aucun produit trouvé</p>
          )
        ) : filteredMenus.length > 0 ? (
          filteredMenus.map((menu) => {
            const inCart = getItem('menu', menu.id);
            return (
              <div key={menu.id} className="menu-card formula">
                <div className="menu-card-image">
                  {menu.image_url ? (
                    <img src={menu.image_url} alt={menu.name} />
                  ) : (
                    <div className="placeholder-image formula">
                      <span>{menu.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="menu-card-content">
                  <h3>{menu.name}</h3>
                  {menu.description && <p className="description">{menu.description}</p>}
                  <div className="menu-card-footer">
                    <span className="price">{menu.price.toLocaleString()} FCFA</span>
                    <Button
                      size="sm"
                      variant={inCart ? 'secondary' : 'primary'}
                      onClick={() => handleAddMenu(menu)}
                      leftIcon={inCart ? <Check size={18} /> : <Plus size={18} />}
                    >
                      {inCart ? inCart.quantity : 'Ajouter'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="no-results">Aucune formule trouvée</p>
        )}
      </div>
    </div>
  );
}
