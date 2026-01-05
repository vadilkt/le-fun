import { createClient } from '@supabase/supabase-js';

// IMPORTANT :
// Renseigne ces variables dans un fichier .env.local à la racine du projet :
//
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...
//
// Tu trouveras ces valeurs dans ton projet Supabase (Settings > API).

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // On log juste un warning pour le dev local.
  // L'app continue de fonctionner en mode "mock" tant que Supabase n'est pas configuré.
  // eslint-disable-next-line no-console
  console.warn(
    '[Le Fun] Supabase non configuré. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans ton .env.local.'
  );
}

// ─── Isolation des sessions par onglet ───────────────────────────────
// Problème : Supabase utilise BroadcastChannel pour synchroniser l'auth
// entre les onglets du même navigateur. Si vous vous connectez comme
// "client" dans l'onglet 2, l'onglet 1 (admin) reçoit l'événement et
// écrase sa session.
//
// Solution : Chaque onglet reçoit un ID unique stocké dans sessionStorage
// (qui est natif par-onglet). Le storageKey et donc le BroadcastChannel
// sont différents par onglet → isolation totale.
// ─────────────────────────────────────────────────────────────────────
const TAB_ID_KEY = 'le-fun-tab-id';
let tabId = typeof window !== 'undefined' ? sessionStorage.getItem(TAB_ID_KEY) : null;
if (!tabId && typeof window !== 'undefined') {
  tabId = crypto.randomUUID();
  sessionStorage.setItem(TAB_ID_KEY, tabId);
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: window.sessionStorage,
      storageKey: `le-fun-session-${tabId}`,
      autoRefreshToken: true,
      persistSession: true,
    },
  })
  : (null as any);
