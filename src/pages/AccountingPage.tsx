import '../App.css';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
    .reduce((sum, t) => sum + t.amount, 0);
  const net = totalSales + totalExpenses;

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
          <div className="card-value">
            {totalSales.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Dépenses</span>
          </div>
          <div className="card-value">
            {totalExpenses.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Résultat net</span>
          </div>
          <div className="card-value">
            {net.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="section-title">Transactions récentes</div>
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
                      color: t.amount >= 0 ? '#16a34a' : '#b91c1c',
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

