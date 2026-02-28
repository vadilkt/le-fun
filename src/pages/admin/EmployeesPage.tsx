import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ROLE_LABELS, type UserRole } from '../../types/roles';
import type { Profile } from '../../types';

const STAFF_ROLES: UserRole[] = ['admin', 'manager', 'cuisinier', 'serveur', 'caissier'];

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'serveur' as UserRole,
    phone: '',
  });

  // Charger les employés
  const loadEmployees = async () => {
    if (!supabase) {
      // Données démo
      setEmployees([
        { id: '1', full_name: 'Admin Le Fun', role: 'admin', is_active: true },
        { id: '2', full_name: 'Marie Manager', role: 'manager', is_active: true },
        { id: '3', full_name: 'Pierre Cuisinier', role: 'cuisinier', is_active: true },
        { id: '4', full_name: 'Jean Serveur', role: 'serveur', is_active: true },
        { id: '5', full_name: 'Sophie Caissière', role: 'caissier', is_active: false },
      ]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', STAFF_ROLES)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Erreur chargement employés:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Ouvrir modal création
  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'serveur',
      phone: '',
    });
    setError(null);
    setShowModal(true);
  };

  // Ouvrir modal édition
  const openEditModal = (employee: Profile) => {
    setEditingEmployee(employee);
    setFormData({
      email: '',
      password: '',
      full_name: employee.full_name || '',
      role: employee.role,
      phone: employee.phone || '',
    });
    setError(null);
    setShowModal(true);
  };

  // Créer un employé
  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!supabase) {
      const newEmployee: Profile = {
        id: Math.random().toString(),
        full_name: formData.full_name,
        role: formData.role,
        is_active: true,
        phone: formData.phone || null,
      };
      setEmployees((prev) => [...prev, newEmployee]);
      setShowModal(false);
      return;
    }

    try {
      // Créer l'utilisateur dans Supabase Auth
      const { error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone,
        },
      });

      if (authError) {
        // Si admin.createUser n'est pas disponible, utiliser signUp normal
        if (authError.message.includes('not allowed') || authError.message.includes('admin')) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: formData.full_name,
                role: formData.role,
                phone: formData.phone,
              },
            },
          });

          if (signUpError) throw signUpError;
        } else {
          throw authError;
        }
      }

      loadEmployees();
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    }
  };

  // Mettre à jour un employé
  const handleUpdate = async () => {
    if (!editingEmployee || !formData.full_name) return;

    if (!supabase) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === editingEmployee.id
            ? { ...e, full_name: formData.full_name, role: formData.role, phone: formData.phone }
            : e
        )
      );
      setShowModal(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone || null,
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;

      loadEmployees();
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    }
  };

  // Activer/Désactiver un employé
  const toggleActive = async (employee: Profile) => {
    if (!supabase) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employee.id ? { ...e, is_active: !e.is_active } : e
        )
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !employee.is_active })
        .eq('id', employee.id);

      if (error) throw error;
      loadEmployees();
    } catch (err) {
      console.error('Erreur toggle actif:', err);
    }
  };

  // Supprimer un employé (désactivation)
  const handleDelete = async (employeeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;

    if (!supabase) {
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
      return;
    }

    try {
      // On désactive plutôt que supprimer pour garder l'historique
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', employeeId);

      if (error) throw error;
      loadEmployees();
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement des employés..." />;
  }

  return (
    <div className="employees-page">
      <div className="section-header">
        <h1 className="page-title">Gestion des employés</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          Nouvel employé
        </button>
      </div>

      <div className="employees-table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Téléphone</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className={!employee.is_active ? 'inactive' : ''}>
                <td>
                  <strong>{employee.full_name || 'Sans nom'}</strong>
                </td>
                <td>
                  <span className={`role-badge role-${employee.role}`}>
                    {ROLE_LABELS[employee.role]}
                  </span>
                </td>
                <td>{employee.phone || '-'}</td>
                <td>
                  <span className={`status-pill ${employee.is_active ? 'active' : 'inactive'}`}>
                    {employee.is_active ? (
                      <>
                        <UserCheck size={14} />
                        Actif
                      </>
                    ) : (
                      <>
                        <UserX size={14} />
                        Inactif
                      </>
                    )}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => openEditModal(employee)}
                      title="Modifier"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => toggleActive(employee)}
                      title={employee.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {employee.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                    <button
                      className="btn btn-sm btn-ghost danger"
                      onClick={() => handleDelete(employee.id)}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {employees.length === 0 && (
          <p className="no-data">Aucun employé trouvé</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="error-message">
                  <span>{error}</span>
                </div>
              )}

              {!editingEmployee && (
                <>
                  <div className="field">
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="employe@lefun.cm"
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="password">Mot de passe *</label>
                    <input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 6 caractères"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}

              <div className="field">
                <label htmlFor="fullName">Nom complet *</label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Jean Dupont"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="role">Rôle *</label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="phone">Téléphone</label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+237 6XX XXX XXX"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={editingEmployee ? handleUpdate : handleCreate}
              >
                <Save size={18} />
                {editingEmployee ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
