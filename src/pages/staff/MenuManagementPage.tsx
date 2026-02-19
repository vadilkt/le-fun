import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Menu, Product, MenuItem } from '../../types';

interface MenuWithItems extends Menu {
  items: MenuItem[];
}

export function MenuManagementPage() {
  const [menus, setMenus] = useState<MenuWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuWithItems | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    selectedProducts: [] as number[],
  });

  // Charger les données
  const loadData = async () => {
    if (!supabase) {
      // Données démo
      setMenus([
        { id: 1, name: 'Menu Découverte', price: 8000, description: 'Entrée + Plat + Dessert', items: [] },
        { id: 2, name: 'Menu Express', price: 5500, description: 'Plat + Boisson', items: [] },
      ]);
      setProducts([
        { id: 1, name: 'Poulet DG', sale_price: 5000, category_id: 2, cost_price: 2500, current_stock: 10, min_stock: 5, is_active: true },
        { id: 2, name: 'Ndolé', sale_price: 4500, category_id: 2, cost_price: 2000, current_stock: 8, min_stock: 5, is_active: true },
        { id: 3, name: 'Plantains frits', sale_price: 1500, category_id: 5, cost_price: 500, current_stock: 20, min_stock: 10, is_active: true },
      ]);
      setLoading(false);
      return;
    }

    try {
      const [menusRes, productsRes, menuItemsRes] = await Promise.all([
        supabase.from('menus').select('*').order('name'),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('menu_items').select('*'),
      ]);

      const menuItems = menuItemsRes.data || [];
      const menusWithItems = (menusRes.data || []).map((menu: Menu) => ({
        ...menu,
        items: menuItems.filter((item: MenuItem) => item.menu_id === menu.id),
      }));

      setMenus(menusWithItems);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ouvrir le modal pour créer
  const openCreateModal = () => {
    setEditingMenu(null);
    setFormData({
      name: '',
      price: '',
      description: '',
      selectedProducts: [],
    });
    setShowModal(true);
  };

  // Ouvrir le modal pour éditer
  const openEditModal = (menu: MenuWithItems) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      price: menu.price.toString(),
      description: menu.description || '',
      selectedProducts: menu.items.map((i) => i.product_id),
    });
    setShowModal(true);
  };

  // Sauvegarder
  const handleSave = async () => {
    if (!formData.name || !formData.price) return;

    const menuData = {
      name: formData.name,
      price: parseFloat(formData.price),
      description: formData.description || null,
    };

    if (!supabase) {
      if (editingMenu) {
        setMenus((prev) =>
          prev.map((m) =>
            m.id === editingMenu.id
              ? { ...m, ...menuData, items: formData.selectedProducts.map((pid) => ({ id: 0, menu_id: m.id, product_id: pid, quantity: 1 })) }
              : m
          )
        );
      } else {
        const newMenu: MenuWithItems = {
          id: Math.floor(Math.random() * 1000),
          ...menuData,
          items: formData.selectedProducts.map((pid) => ({ id: 0, menu_id: 0, product_id: pid, quantity: 1 })),
        };
        setMenus((prev) => [...prev, newMenu]);
      }
      setShowModal(false);
      return;
    }

    try {
      if (editingMenu) {
        // Mettre à jour le menu
        await supabase.from('menus').update(menuData).eq('id', editingMenu.id);

        // Supprimer les anciens items
        await supabase.from('menu_items').delete().eq('menu_id', editingMenu.id);

        // Ajouter les nouveaux items
        if (formData.selectedProducts.length > 0) {
          const items = formData.selectedProducts.map((productId) => ({
            menu_id: editingMenu.id,
            product_id: productId,
            quantity: 1,
          }));
          await supabase.from('menu_items').insert(items);
        }
      } else {
        // Créer le menu
        const { data: newMenu, error } = await supabase
          .from('menus')
          .insert(menuData)
          .select()
          .single();

        if (error) throw error;

        // Ajouter les items
        if (formData.selectedProducts.length > 0 && newMenu) {
          const items = formData.selectedProducts.map((productId) => ({
            menu_id: newMenu.id,
            product_id: productId,
            quantity: 1,
          }));
          await supabase.from('menu_items').insert(items);
        }
      }

      loadData();
      setShowModal(false);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  // Supprimer
  const handleDelete = async (menuId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce menu ?')) return;

    if (!supabase) {
      setMenus((prev) => prev.filter((m) => m.id !== menuId));
      return;
    }

    try {
      await supabase.from('menu_items').delete().eq('menu_id', menuId);
      await supabase.from('menus').delete().eq('id', menuId);
      loadData();
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  // Toggle produit sélectionné
  const toggleProduct = (productId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter((id) => id !== productId)
        : [...prev.selectedProducts, productId],
    }));
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement des menus..." />;
  }

  return (
    <div className="menu-management-page">
      <div className="section-header">
        <h1 className="page-title">Gestion des menus</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          Nouveau menu
        </button>
      </div>

      <div className="menus-grid">
        {menus.map((menu) => (
          <div key={menu.id} className="card menu-card">
            <div className="menu-card-header">
              <h3>{menu.name}</h3>
              <span className="menu-price">{menu.price.toLocaleString()} FCFA</span>
            </div>

            {menu.description && (
              <p className="menu-description">{menu.description}</p>
            )}

            <div className="menu-products">
              <h4>Produits inclus ({menu.items.length})</h4>
              {menu.items.length > 0 ? (
                <ul>
                  {menu.items.map((item) => {
                    const product = products.find((p) => p.id === item.product_id);
                    return (
                      <li key={item.id || item.product_id}>
                        {product?.name || `Produit #${item.product_id}`}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted">Aucun produit</p>
              )}
            </div>

            <div className="menu-actions">
              <button className="btn btn-ghost" onClick={() => openEditModal(menu)}>
                <Edit2 size={16} />
                Modifier
              </button>
              <button className="btn btn-ghost danger" onClick={() => handleDelete(menu.id)}>
                <Trash2 size={16} />
                Supprimer
              </button>
            </div>
          </div>
        ))}

        {menus.length === 0 && (
          <div className="no-data">
            <p>Aucun menu créé</p>
            <button className="btn btn-primary" onClick={openCreateModal}>
              Créer votre premier menu
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMenu ? 'Modifier le menu' : 'Nouveau menu'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="field">
                <label htmlFor="menuName">Nom du menu *</label>
                <input
                  id="menuName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Menu Découverte"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="menuPrice">Prix (FCFA) *</label>
                <input
                  id="menuPrice"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Ex: 8000"
                  required
                  min="0"
                />
              </div>

              <div className="field">
                <label htmlFor="menuDescription">Description</label>
                <textarea
                  id="menuDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Entrée + Plat + Dessert"
                  rows={2}
                />
              </div>

              <div className="field">
                <label>Produits inclus</label>
                <div className="products-checkbox-list">
                  {products.map((product) => (
                    <label key={product.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.selectedProducts.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                      />
                      <span>{product.name}</span>
                      <span className="muted">({product.sale_price.toLocaleString()} FCFA)</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!formData.name || !formData.price}
              >
                <Save size={18} />
                {editingMenu ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
