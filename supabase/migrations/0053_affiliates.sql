-- Programme affilié : l'équipe invite un compte (ou une adresse) depuis /admin/affilies ; la personne reçoit un lien public
-- /s/<slug> (page « Streamez comme <pseudo> ») et un espace « Affilié » dans son dashboard.
-- `user_id` est renseigné dès que le compte existe (à l'invitation ou à la première visite de l'espace Affilié).
-- `seen_at` vide = pastille « Nouveau » dans le menu ; elle disparaît à la première ouverture de l'espace.
-- Tout passe par le serveur (clé secrète) : RLS activée, aucune règle publique.
create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid unique references auth.users (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  active boolean not null default true,
  invited_by text,
  seen_at timestamptz,
  clicks integer not null default 0
);
create unique index affiliates_slug_unique on public.affiliates (slug);
create unique index affiliates_email_unique on public.affiliates (lower(email));

alter table public.affiliates enable row level security;

-- Compteur de clics sur le lien (page publique -> bouton d'inscription), atomique.
create function public.affiliate_click(p_slug text) returns void
language sql security definer set search_path = ''
as $$ update public.affiliates set clicks = clicks + 1 where slug = p_slug and active; $$;
revoke execute on function public.affiliate_click(text) from public, anon, authenticated;
