-- SYXTEE : prénom + nom à la place du pseudo (connexion email + mot de passe).
-- À exécuter sur le projet de production ET sur le projet de test.
--
-- Le pseudo (username) reste en base, mais n'est plus demandé ni affiché : il sert encore d'identifiant technique.
-- Prénom et nom : obligatoires à l'inscription (métadonnées de signUp), demandés par une modale aux comptes existants.

alter table public.profiles
  add column first_name text check (char_length(btrim(first_name)) between 1 and 50),
  add column last_name text check (char_length(btrim(last_name)) between 1 and 50),
  -- Afficher son prénom sur le site (« Ils nous font confiance ») : décoché par défaut, jamais sans accord.
  add column show_first_name boolean not null default false;

grant update (first_name, last_name, show_first_name) on public.profiles to authenticated;

-- Nouveau compte : prénom et nom repris des métadonnées envoyées par /inscription (nettoyés, 50 caractères max).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  n int := 0;
  fname text := nullif(left(btrim(new.raw_user_meta_data ->> 'first_name'), 50), '');
  lname text := nullif(left(btrim(new.raw_user_meta_data ->> 'last_name'), 50), '');
begin
  base := lower(coalesce(
    new.raw_user_meta_data ->> 'slug',
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'user_name',
    split_part(new.email, '@', 1),
    ''
  ));
  base := left(regexp_replace(base, '[^a-z0-9_]', '', 'g'), 20);
  if char_length(base) < 3 then
    base := 'streamer';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || floor(random() * 9000 + 1000)::int;
    exit when n > 20;
  end loop;
  insert into public.profiles (id, username, first_name, last_name) values (new.id, candidate, fname, lname);
  return new;
end $$;

-- Vue publique de l'accueil : le prénom n'apparaît que si la personne l'a accepté (colonne ajoutée en fin de vue).
create or replace view public.public_streamers as
  select username, avatar_url, twitch_id, twitch_login, twitch_display_name,
    case when show_first_name then first_name end as first_name
  from public.profiles
  where show_on_site and twitch_id is not null;
