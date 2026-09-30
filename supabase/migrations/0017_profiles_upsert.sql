-- SYXTEE : enregistrement du prénom et du nom fiable (upsert), même pour un compte sans ligne profiles.
-- À exécuter sur le projet de production ET sur le projet de test, APRÈS 0012 à 0016.
-- Idempotente : peut être rejouée sans risque.
--
-- Bug corrigé : en production, 0013 n'était pas appliquée, donc profiles.first_name n'existait pas
-- (PostgREST 42703 « column profiles.first_name does not exist ») et la modale affichait « Enregistrement impossible ».

-- Colonnes (déjà créées par 0013 ; rejouées ici au cas où).
alter table public.profiles
  add column if not exists first_name text check (char_length(btrim(first_name)) between 1 and 50),
  add column if not exists last_name text check (char_length(btrim(last_name)) between 1 and 50),
  add column if not exists show_first_name boolean not null default false;

-- Chaque compte peut créer SA ligne (upsert du prénom/nom), jamais celle d'un autre.
-- Lecture et modification de sa propre ligne : policies « Lire son profil » et « Modifier son profil » (0001).
drop policy if exists "Créer son profil" on public.profiles;
create policy "Créer son profil" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

-- Note : le site ne fait plus d'upsert avec la session de l'utilisateur (l'INSERT évalue le défaut support_id,
-- new_support_id() est interdite aux comptes → 42501). Il fait un update, et la clé serveur crée la ligne si elle manque.
-- Droits ci-dessous gardés : inoffensifs grâce aux policies.
-- Upsert PostgREST : INSERT (id, first_name, last_name) ... ON CONFLICT (id) DO UPDATE SET id = excluded.id, ...
-- d'où le droit update sur id : la policy impose id = auth.uid(), donc la valeur ne peut pas changer.
grant insert (id, first_name, last_name) on public.profiles to authenticated;
grant update (id, first_name, last_name, show_first_name) on public.profiles to authenticated;

-- Création automatique du profil à l'inscription (fonction handle_new_user de 0013) : trigger garanti.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Comptes existants sans ligne profiles : une ligne chacun (pseudo technique unique, prénom/nom des métadonnées).
insert into public.profiles (id, username, first_name, last_name)
select
  u.id,
  'streamer_' || left(replace(u.id::text, '-', ''), 12),
  nullif(left(btrim(u.raw_user_meta_data ->> 'first_name'), 50), ''),
  nullif(left(btrim(u.raw_user_meta_data ->> 'last_name'), 50), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
