// Rôles utilisateur
export type UserRole =
  | 'client'      // Client - peut commander
  | 'cuisinier'   // Cuisine - prépare les commandes
  | 'serveur'     // Serveur - crée commandes, gère statuts
  | 'caissier'    // Caissier - crée commandes, encaisse
  | 'manager'     // Manager - staff + édition menus
  | 'admin';      // Admin - accès complet

// Hiérarchie des rôles (pour comparaisons)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  client: 1,
  cuisinier: 2,
  serveur: 3,
  caissier: 3,
  manager: 4,
  admin: 5,
};

// Labels français pour l'affichage
export const ROLE_LABELS: Record<UserRole, string> = {
  client: 'Client',
  cuisinier: 'Cuisinier',
  serveur: 'Serveur',
  caissier: 'Caissier',
  manager: 'Manager',
  admin: 'Administrateur',
};

// Permissions du système
export const PERMISSIONS = {
  // Client
  VIEW_MENU: ['client', 'serveur', 'caissier', 'manager', 'admin'],
  PLACE_OWN_ORDER: ['client'],
  VIEW_OWN_ORDERS: ['client'],

  // Cuisine
  VIEW_KITCHEN_QUEUE: ['cuisinier', 'manager', 'admin'],
  MARK_ORDER_READY: ['cuisinier', 'manager', 'admin'],

  // Personnel
  CREATE_ORDER_FOR_CUSTOMER: ['serveur', 'caissier', 'manager', 'admin'],
  UPDATE_ORDER_STATUS: ['serveur', 'caissier', 'manager', 'admin'],
  VIEW_ALL_ORDERS: ['serveur', 'caissier', 'manager', 'admin'],
  EDIT_MENUS: ['manager', 'admin'],

  // Admin
  VIEW_DASHBOARD: ['manager', 'admin'],
  MANAGE_INVENTORY: ['admin'],
  MANAGE_EMPLOYEES: ['admin'],
  VIEW_ACCOUNTING: ['manager', 'admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Vérifier si un rôle a une permission
export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

// Vérifier si un rôle est du personnel (non-client)
export function isStaffRole(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return ['serveur', 'caissier', 'manager', 'admin', 'cuisinier'].includes(role);
}

// Obtenir la route par défaut selon le rôle
export function getDefaultRouteForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case 'client':
      return '/customer';
    case 'cuisinier':
      return '/kitchen';
    case 'serveur':
    case 'caissier':
      return '/staff';
    case 'manager':
      return '/staff';
    case 'admin':
      return '/admin';
    default:
      return '/customer/login';
  }
}

// Rôles autorisés par interface
export const INTERFACE_ROLES = {
  customer: ['client'] as UserRole[],
  kitchen: ['cuisinier', 'manager', 'admin'] as UserRole[],
  staff: ['serveur', 'caissier', 'manager', 'admin'] as UserRole[],
  admin: ['admin'] as UserRole[],
};
