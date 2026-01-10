import { useState } from 'react';

type Role = 'admin' | 'manager' | 'serveur' | 'cuisinier' | 'caissier';

export type AuthUser = {
  id: string;
  fullName: string;
  role: Role;
};

// NOTE:
// Ce hook est une fausse authentification locale pour développement.
// Ensuite, on pourra le remplacer par l’auth Supabase (supabase.auth.signInWithPassword, etc).

export function useMockAuth() {
  const [user] = useState<AuthUser | null>({
    id: '1',
    fullName: 'Admin Le Fun',
    role: 'admin',
  });

  return { user };
}

