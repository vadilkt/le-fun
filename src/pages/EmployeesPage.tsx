import '../App.css';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type EmployeeRole = 'admin' | 'manager' | 'serveur' | 'cuisinier' | 'caissier';

type Employee = {
  id: string;
  name: string;
  role: EmployeeRole;
  active: boolean;
};

function roleLabel(role: EmployeeRole) {
  switch (role) {
    case 'admin':
      return 'Administrateur';
    case 'manager':
      return 'Manager';
    case 'serveur':
      return 'Serveur';
    case 'cuisinier':
      return 'Cuisinier';
    case 'caissier':
      return 'Caissier';
  }
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
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
          .from('profiles')
          .select('id,full_name,role,is_active')
          .order('full_name');
        if (error) throw error;

        if (!ignore) {
          setEmployees(
            (data ?? []).map((p: any) => ({
              id: p.id,
              name: p.full_name ?? p.id,
              role: (p.role ?? 'serveur') as EmployeeRole,
              active: p.is_active,
            }))
          );
        }
      } catch (e: any) {
        if (!ignore) setError(e.message ?? 'Erreur lors du chargement des employés');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title">Employés</h1>
        <button className="btn btn-primary">Nouvel employé</button>
      </div>

      {error && (
        <p className="muted" style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>
          {error}
        </p>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Rôle</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {loading && employees.length === 0 ? (
            <tr>
              <td colSpan={3}>
                <span className="muted">Chargement des employés...</span>
              </td>
            </tr>
          ) : (
            employees.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>
                  <span className="pill">{roleLabel(e.role)}</span>
                </td>
                <td>
                  <span
                    className="status-pill"
                    style={{
                      background: e.active ? '#ecfdf3' : '#fee2e2',
                    }}
                  >
                    <span
                      className="status-pill-dot"
                      style={{
                        background: e.active ? '#16a34a' : '#ef4444',
                      }}
                    />
                    {e.active ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

