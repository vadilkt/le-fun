import {
  PlusCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Product = {
  id: number;
  name: string;
  category: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  minStock: number;
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  products: number[];
};

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);

  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [menuFormOpen, setMenuFormOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!supabase) {
        // Données démo
        setProducts([
          { id: 1, name: 'Poulet DG', category: 'Plats', salePrice: 5000, costPrice: 2500, stock: 10, minStock: 5 },
          { id: 2, name: 'Ndolé', category: 'Plats', salePrice: 4500, costPrice: 2000, stock: 8, minStock: 5 },
          { id: 3, name: 'Plantains frits', category: 'Accompagnements', salePrice: 1500, costPrice: 500, stock: 3, minStock: 10 },
        ]);
        setMenus([
          { id: 1, name: 'Menu Découverte', price: 8000, products: [1, 3] },
        ]);
        setLoading(false);
        return;
      }

      try {
        const [{ data: productsData, error: pError }, { data: menusData, error: mError }, { data: menuItemsData, error: miError }] =
          await Promise.all([
            supabase
              .from('products')
              .select('id,name,sale_price,cost_price,current_stock,min_stock,categories(name)')
              .order('name'),
            supabase.from('menus').select('id,name,price').order('name'),
            supabase.from('menu_items').select('id,menu_id,product_id'),
          ]);

        if (pError || mError || miError) {
          throw pError || mError || miError;
        }

        if (!ignore) {
          setProducts(
            (productsData ?? []).map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.categories?.name ?? 'Autre',
              salePrice: p.sale_price,
              costPrice: p.cost_price,
              stock: p.current_stock,
              minStock: p.min_stock,
            }))
          );

          const byMenu: Record<number, number[]> = {};
          (menuItemsData ?? []).forEach((mi: any) => {
            if (!byMenu[mi.menu_id]) byMenu[mi.menu_id] = [];
            byMenu[mi.menu_id].push(mi.product_id);
          });

          setMenus(
            (menusData ?? []).map((m: any) => ({
              id: m.id,
              name: m.name,
              price: m.price,
              products: byMenu[m.id] ?? [],
            }))
          );
        }
      } catch (e: any) {
        if (!ignore) {
          setError(e.message ?? 'Erreur lors du chargement de l\'inventaire');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductFormOpen(true);
  };

  const saveProduct = async (data: Omit<Product, 'id'>, id?: number) => {
    if (!supabase) {
      if (id) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...data } : p))
        );
      } else {
        const nextId = Math.max(0, ...products.map((p) => p.id)) + 1;
        setProducts((prev) => [...prev, { id: nextId, ...data }]);
      }
      setProductFormOpen(false);
      return;
    }

    setError(null);

    try {
      const { data: existingCat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', data.category)
        .maybeSingle();

      let categoryId = existingCat?.id;
      if (!categoryId) {
        const { data: newCat, error: catError } = await supabase
          .from('categories')
          .insert({ name: data.category })
          .select('id')
          .single();
        if (catError) throw catError;
        categoryId = newCat.id;
      }

      if (id) {
        const { error } = await supabase
          .from('products')
          .update({
            name: data.name,
            category_id: categoryId,
            sale_price: data.salePrice,
            cost_price: data.costPrice,
            current_stock: data.stock,
            min_stock: data.minStock,
          })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert({
          name: data.name,
          category_id: categoryId,
          sale_price: data.salePrice,
          cost_price: data.costPrice,
          current_stock: data.stock,
          min_stock: data.minStock,
        });
        if (error) throw error;
      }

      const { data: productsData, error: pError } = await supabase
        .from('products')
        .select('id,name,sale_price,cost_price,current_stock,min_stock,categories(name)')
        .order('name');
      if (pError) throw pError;

      setProducts(
        (productsData ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.categories?.name ?? 'Autre',
          salePrice: p.sale_price,
          costPrice: p.cost_price,
          stock: p.current_stock,
          minStock: p.min_stock,
        }))
      );
      setProductFormOpen(false);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'enregistrement du produit');
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('Supprimer ce produit ?')) return;
    if (!supabase) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    setError(null);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la suppression du produit');
    }
  };

  const openCreateMenu = () => {
    setEditingMenu(null);
    setMenuFormOpen(true);
  };

  const saveMenu = async (data: Omit<MenuItem, 'id'>, id?: number) => {
    if (!supabase) {
      if (id) {
        setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)));
      } else {
        const nextId = Math.max(0, ...menus.map((m) => m.id)) + 1;
        setMenus((prev) => [...prev, { id: nextId, ...data }]);
      }
      setMenuFormOpen(false);
      return;
    }

    setError(null);

    try {
      let menuId = id;
      if (menuId) {
        const { error } = await supabase
          .from('menus')
          .update({ name: data.name, price: data.price })
          .eq('id', menuId);
        if (error) throw error;

        await supabase.from('menu_items').delete().eq('menu_id', menuId);
      } else {
        const { data: menu, error } = await supabase
          .from('menus')
          .insert({ name: data.name, price: data.price })
          .select('id')
          .single();
        if (error) throw error;
        menuId = menu.id;
      }

      if (data.products.length > 0 && menuId) {
        const rows = data.products.map((productId) => ({
          menu_id: menuId!,
          product_id: productId,
          quantity: 1,
        }));
        await supabase.from('menu_items').insert(rows);
      }

      const [{ data: menusData }, { data: menuItemsData }] = await Promise.all([
        supabase.from('menus').select('id,name,price').order('name'),
        supabase.from('menu_items').select('id,menu_id,product_id'),
      ]);

      const byMenu: Record<number, number[]> = {};
      (menuItemsData ?? []).forEach((mi: any) => {
        if (!byMenu[mi.menu_id]) byMenu[mi.menu_id] = [];
        byMenu[mi.menu_id].push(mi.product_id);
      });

      setMenus(
        (menusData ?? []).map((m: any) => ({
          id: m.id,
          name: m.name,
          price: m.price,
          products: byMenu[m.id] ?? [],
        }))
      );
      setMenuFormOpen(false);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'enregistrement du menu');
    }
  };

  const deleteMenu = async (id: number) => {
    if (!confirm('Supprimer ce menu ?')) return;
    if (!supabase) {
      setMenus((prev) => prev.filter((m) => m.id !== id));
      return;
    }
    setError(null);
    try {
      const { error } = await supabase.from('menus').delete().eq('id', id);
      if (error) throw error;
      setMenus((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la suppression du menu');
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title">Inventaire & Menus</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={openCreateMenu}>
            <UtensilsCrossed size={16} />
            Nouveau menu
          </button>
          <button className="btn btn-primary" onClick={openCreateProduct}>
            <PlusCircle size={16} />
            Nouvel article
          </button>
        </div>
      </div>

      {/* Produits */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="section-header">
          <div className="section-title">Produits de l'inventaire</div>
          <span className="muted">{products.length} articles</span>
        </div>

        {error && (
          <p className="muted" style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>
            {error}
          </p>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Prix vente</th>
              <th>Coût</th>
              <th>Marge</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && products.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <span className="muted">Chargement des produits...</span>
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const margin = ((p.salePrice - p.costPrice) / p.salePrice) * 100;
                const isLow = p.stock <= p.minStock;
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><span className="pill">{p.category}</span></td>
                    <td>{p.salePrice.toLocaleString('fr-FR')} FCFA</td>
                    <td>{p.costPrice.toLocaleString('fr-FR')} FCFA</td>
                    <td>{margin.toFixed(1)}%</td>
                    <td>
                      <span className="status-pill" style={{ background: isLow ? '#fee2e2' : '#ecfdf3' }}>
                        <span className="status-pill-dot" style={{ background: isLow ? '#ef4444' : '#16a34a' }} />
                        {p.stock}
                        {isLow && <AlertTriangle size={14} color="#b91c1c" style={{ marginLeft: 4 }} />}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" onClick={() => { setEditingProduct(p); setProductFormOpen(true); }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost" onClick={() => deleteProduct(p.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Menus */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">Menus & formules</div>
          <span className="muted">{menus.length} menus</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Menu</th>
              <th>Prix</th>
              <th>Produits inclus</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && menus.length === 0 ? (
              <tr>
                <td colSpan={4}><span className="muted">Chargement des menus...</span></td>
              </tr>
            ) : (
              menus.map((m) => {
                const included = m.products
                  .map((id) => products.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(', ');
                return (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.price.toLocaleString('fr-FR')} FCFA</td>
                    <td style={{ maxWidth: 260 }}>{included || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" onClick={() => { setEditingMenu(m); setMenuFormOpen(true); }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost" onClick={() => deleteMenu(m.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {productFormOpen && (
        <ProductFormModal
          product={editingProduct}
          onCancel={() => setProductFormOpen(false)}
          onSave={saveProduct}
        />
      )}

      {menuFormOpen && (
        <MenuFormModal
          menu={editingMenu}
          products={products}
          onCancel={() => setMenuFormOpen(false)}
          onSave={saveMenu}
        />
      )}
    </div>
  );
}

function ProductFormModal({ product, onCancel, onSave }: {
  product: Product | null;
  onCancel: () => void;
  onSave: (data: Omit<Product, 'id'>, id?: number) => void;
}) {
  const [form, setForm] = useState<Omit<Product, 'id'>>(
    product ?? { name: '', category: 'Plats', salePrice: 0, costPrice: 0, stock: 0, minStock: 10 }
  );

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Modifier le produit' : 'Nouveau produit'}</h2>
          <button className="close-btn" onClick={onCancel}><X size={24} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form, product?.id); }}>
          <div className="modal-body">
            <div className="field">
              <label>Nom</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Catégorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option>Entrées</option>
                <option>Plats</option>
                <option>Desserts</option>
                <option>Boissons</option>
                <option>Accompagnements</option>
              </select>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label>Prix vente (FCFA)</label>
                <input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} required min={0} />
              </div>
              <div className="field">
                <label>Coût (FCFA)</label>
                <input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} required min={0} />
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label>Stock actuel</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} required min={0} />
              </div>
              <div className="field">
                <label>Stock minimum</label>
                <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} required min={0} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" type="button" onClick={onCancel}>Annuler</button>
            <button className="btn btn-primary" type="submit">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MenuFormModal({ menu, products, onCancel, onSave }: {
  menu: MenuItem | null;
  products: Product[];
  onCancel: () => void;
  onSave: (data: Omit<MenuItem, 'id'>, id?: number) => void;
}) {
  const [name, setName] = useState(menu?.name ?? '');
  const [price, setPrice] = useState(menu?.price ?? 0);
  const [selectedIds, setSelectedIds] = useState<number[]>(menu?.products ?? []);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{menu ? 'Modifier le menu' : 'Nouveau menu'}</h2>
          <button className="close-btn" onClick={onCancel}><X size={24} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ name, price, products: selectedIds }, menu?.id); }}>
          <div className="modal-body">
            <div className="field">
              <label>Nom du menu</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Prix (FCFA)</label>
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} required min={0} />
            </div>
            <div className="field">
              <label>Produits inclus</label>
              <div className="products-checkbox-list">
                {products.map((p) => (
                  <label key={p.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => setSelectedIds((prev) => prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id])}
                    />
                    <span>{p.name}</span>
                    <span className="muted">({p.salePrice.toLocaleString()} FCFA)</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" type="button" onClick={onCancel}>Annuler</button>
            <button className="btn btn-primary" type="submit">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
