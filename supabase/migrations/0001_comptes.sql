-- SYXTEE : comptes utilisateurs, profils publics, avatars et limitation des envois.
-- À exécuter une fois dans Supabase (SQL Editor) sur le projet de production ET sur le projet de test.

-- ─────────────────────────── Profils ───────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  avatar_url text,
  bio text check (char_length(bio) <= 160),
  country text check (country ~ '^[A-Z]{2}$'),
  -- Twitch : uniquement renseigné par le serveur depuis une connexion Twitch vérifiée (OAuth).
  twitch_id text unique,
  twitch_login text,
  twitch_display_name text,
  -- Autres réseaux : pseudos seuls (jamais d'URL libre).
  kick text check (kick ~ '^[A-Za-z0-9_]{3,25}$'),
  youtube text check (youtube ~ '^[A-Za-z0-9._-]{3,30}$'),
  tiktok text check (tiktok ~ '^[A-Za-z0-9._]{2,24}$'),
  instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  x text check (x ~ '^[A-Za-z0-9_]{1,15}$'),
  -- Consentement explicite pour apparaître sur l'accueil (décoché par défaut) + date, preuve RGPD.
  show_on_site boolean not null default false,
  show_on_site_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Lire son profil" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "Modifier son profil" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Colonnes modifiables par l'utilisateur. Twitch, avatar et dates : serveur uniquement (clé secrète).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, bio, country, kick, youtube, tiktok, instagram, x, show_on_site, onboarded_at) on public.profiles to authenticated;

-- Dates tenues à jour automatiquement.
create function public.profiles_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.show_on_site and not old.show_on_site then
    new.show_on_site_at := now();
  elsif not new.show_on_site then
    new.show_on_site_at := null;
  end if;
  -- onboarded_at ne peut qu'être posé (jamais effacé ni antidaté).
  if old.onboarded_at is not null then
    new.onboarded_at := old.onboarded_at;
  elsif new.onboarded_at is not null then
    new.onboarded_at := now();
  end if;
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.profiles_touch();

-- Un profil est créé à chaque nouveau compte (lien magique, Twitch, Discord ou Google).
-- Pseudo proposé à partir du fournisseur, rendu unique ; l'utilisateur le confirme sur /bienvenue.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(coalesce(
    new.raw_user_meta_data ->> 'slug',
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'name',
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
  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vue publique de l'accueil : seulement les comptes qui ont coché la case ET lié un Twitch vérifié.
create view public.public_streamers as
  select username, avatar_url, twitch_id, twitch_login, twitch_display_name
  from public.profiles
  where show_on_site and twitch_id is not null;

grant select on public.public_streamers to anon, authenticated;

-- ─────────────────────────── Avatars ───────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Chaque utilisateur écrit uniquement dans son dossier avatars/<uid>/.
create policy "Avatar : lire le sien" on storage.objects
  for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Avatar : envoyer" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Avatar : remplacer" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Avatar : supprimer" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─────────────────────── Limitation des envois ───────────────────────
-- Les appels à Supabase partent du serveur Vercel (même IP pour tout le monde) : on limite nous-mêmes,
-- par adresse email et par IP du visiteur. Accessible uniquement avec la clé secrète (service_role).

create schema if not exists private;

create table private.rate_limits (
  key text not null,
  hit_at timestamptz not null default now()
);
create index rate_limits_key_hit on private.rate_limits (key, hit_at);

create function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  hits int;
begin
  -- Ménage occasionnel : rien n'est gardé plus de 24 h.
  if random() < 0.02 then
    delete from private.rate_limits where hit_at < now() - interval '1 day';
  end if;
  select count(*) into hits from private.rate_limits
    where key = p_key and hit_at > now() - make_interval(secs => p_window_seconds);
  if hits >= p_max then
    return false;
  end if;
  insert into private.rate_limits (key) values (p_key);
  return true;
end $$;

revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
