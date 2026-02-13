import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Transaction = {
  id: number;
  date: string;
  type: 'vente' | 'achat' | 'autre';
  label: string;
  amount: number;
};

export function AccountingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!supabase) {
        // Données démo
        setTransactions([
          { id: 1, date: new Date().toISOString().split('T')[0], type: 'vente', label: 'Commande #101', amount: 12000 },
          { id: 2, date: new Date().toISOString().split('T')[0], type: 'vente', label: 'Commande #102', amount: 8500 },
          { id: 3, date: new Date(Date.now() - 86400000).toISOString().split('T')[0], type: 'achat', label: 'Achat ingrédients', amount: -25000 },
          { id: 4, date: new Date(Date.now() - 86400000).toISOString().split('T')[0], type: 'vente', label: 'Commande #100', amount: 15000 },
        ]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('id,date,type,label,amount')
          .order('date', { ascending: false })
          .limit(100);
        if (error) throw error;

        if (!ignore) {
          setTransactions(
            (data ?? []).map((t: any) => ({
              id: t.id,
              date: t.date,
              type: t.type,
              label: t.label,
              amount: t.amount,
            }))
          );
        }
      } catch (e: any) {
        if (!ignore) setError(e.message ?? 'Erreur lors du chargement des transactions');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const totalSales = transactions
    .filter((t) => t.type === 'vente')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type !== 'vente')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const net = totalSales - totalExpenses;

  return (
    <div>
      <h1 className="page-title">Comptabilité</h1>

      {error && (
        <p className="muted" style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>
          {error}
        </p>
      )}

      <div className="stats-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Ventes</span>
          </div>
          <div className="card-value" style={{ color: '#16a34a' }}>
            +{totalSales.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Dépenses</span>
          </div>
          <div className="card-value" style={{ color: '#ef4444' }}>
            -{totalExpenses.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Résultat net</span>
          </div>
          <div className="card-value" style={{ color: net >= 0 ? '#16a34a' : '#ef4444' }}>
            {net >= 0 ? '+' : ''}{net.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="section-title">Transactions récentes</div>
          <span className="muted">{transactions.length} transactions</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {loading && transactions.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <span className="muted">Chargement des transactions...</span>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <span className="muted">Aucune transaction</span>
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <span className="pill">
                      {t.type === 'vente'
                        ? 'Vente'
                        : t.type === 'achat'
                        ? 'Achat'
                        : 'Autre'}
                    </span>
                  </td>
                  <td>{t.label}</td>
                  <td
                    style={{
                      color: t.amount >= 0 ? '#16a34a' : '#ef4444',
                      fontWeight: 600,
                    }}
                  >
                    {t.amount >= 0 ? '+' : ''}
                    {t.amount.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
