-- ============================================================
-- TRIGGER : Création automatique du profil à l'inscription
-- ============================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================


-- ============================================================
-- ÉTAPE 1 : Fonction du trigger
-- On n'insère PAS la colonne `role` pour éviter tout problème
-- de cast TEXT → enum. La valeur DEFAULT de la colonne
-- ('client') est utilisée automatiquement par PostgreSQL.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, is_active, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    true,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN others THEN
  RAISE WARNING '[Le Fun] handle_new_user a échoué pour % : %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;


-- ============================================================
-- ÉTAPE 2 : Attacher le trigger sur auth.users
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- ÉTAPE 3 : Backfill des utilisateurs existants sans profil
-- ============================================================
INSERT INTO public.profiles (id, full_name, is_active, phone)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  true,
  u.raw_user_meta_data->>'phone'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);


-- ============================================================
-- ÉTAPE 4 : Vérification finale
-- ============================================================
SELECT p.id, p.full_name, p.role, p.is_active, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;
