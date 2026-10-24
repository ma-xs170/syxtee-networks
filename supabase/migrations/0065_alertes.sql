-- Alertes Discord : le Core écrit sur le webhook Discord du compte quand le flux est perdu (puis revenu) et quand le plafond mensuel du palier Gratuit approche.
-- Chaque compte ne voit et ne modifie que sa ligne ; le Core lit avec la clé secrète.

create table public.alert_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  discord_url text check (discord_url is null or discord_url ~ '^https://(ptb\.|canary\.)?discord(app)?\.com/api/webhooks/[0-9]{15,25}/[A-Za-z0-9_-]{20,100}$'),
  on_drop boolean not null default true,
  on_quota boolean not null default true,
  -- Dernier seuil de quota annoncé, « 2026-10:80 » : évite de répéter l'alerte tout le mois.
  quota_notified text,
  updated_at timestamptz not null default now()
);

alter table public.alert_settings enable row level security;

create policy "Lire ses alertes" on public.alert_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Créer ses alertes" on public.alert_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Modifier ses alertes" on public.alert_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.alert_settings to authenticated;
