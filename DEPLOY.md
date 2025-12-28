# Guide de Déploiement - Le Fun App

Votre application est prête à être déployée en production !
Elle est configurée pour fonctionner sur la plupart des plateformes modernes (Vercel, Netlify, etc.).

## Option 1 : Déploiement sur Netlify (Recommandé - Simple)

1.  Connectez votre compte GitHub/GitLab à Netlify.
2.  Importez ce dépôt.
3.  Netlify détectera automatiquement la configuration grâce au fichier `netlify.toml` inclus.
4.  **Important** : Ajoutez vos variables d'environnement dans les paramètres du site (Site Settings > Build & Deploy > Environment) :
    *   `VITE_SUPABASE_URL` : Votre URL Supabase
    *   `VITE_SUPABASE_ANON_KEY` : Votre clé publique Supabase

## Option 2 : Déploiement sur Vercel (Recommandé - Rapide)

1.  Installez Vercel CLI : `npm i -g vercel`
2.  Connectez-vous : `vercel login`
3.  À la racine du projet, lancez : `vercel`
4.  Suivez les instructions à l'écran.
5.  Ajoutez les variables d'environnement quand demandé.

## Option 3 : Déploiement Manuel (Serveur Web classique)

1.  Lancez le build local : `npm run build`
2.  Le dossier `dist/` contient votre site web statique optimisé.
3.  Uploadez le contenu de `dist/` sur votre FTP ou serveur web (Apache/Nginx).
4.  ⚠️ **Attention** : Si vous utilisez Apache/Nginx, vous devez configurer la réécriture d'URL pour rediriger toutes les requêtes vers `index.html` (sinon le rafraîchissement d'une page produira une erreur 404).

## Checklist Avant Mise en Ligne

- [ ] Avoir configuré les variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) sur l'hébergeur.
- [ ] Avoir activé les Policies RLS dans Supabase (déjà fait via `migration.sql`).
- [ ] Avoir créé un premier utilisateur Admin via l'interface puis SQL.
