-- Chaînes mises en avant sur l'accueil (« Ils streament avec SYXTEE. »), ajoutées à la main depuis /admin/chaines.
-- Une chaîne ajoutée par l'équipe est approuvée tout de suite ; `approved = false` la masque sans la supprimer.
create table public.featured_channels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  platform text not null check (platform = 'twitch'),
  login text not null check (char_length(login) between 1 and 80),
  approved boolean not null default true,
  added_by text
);
create unique index featured_channels_unique on public.featured_channels (platform, lower(login));

alter table public.featured_channels enable row level security;
-- Lecture publique des chaînes approuvées (l'accueil est public) ; l'écriture ne passe que par le serveur (clé secrète).
create policy "featured_channels_read" on public.featured_channels for select using (approved);

insert into public.featured_channels (platform, login, added_by) values ('twitch', 'jonk_a', 'migration');
