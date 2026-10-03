-- Pseudo Twitch saisi à la main (sans connexion Twitch) : le lien devient https://twitch.tv/<pseudo>, comme Kick et YouTube.
-- Un Twitch vérifié (twitch_login / twitch_id, via connexion) garde la priorité. Le mur de l'accueil accepte les deux.
alter table public.profiles add column if not exists twitch text check (twitch ~ '^[A-Za-z0-9_]{3,25}$');

grant update (twitch) on public.profiles to authenticated;

create or replace view public.public_streamers as
  select p.username, p.avatar_url, p.twitch_id, coalesce(p.twitch_login, p.twitch) as twitch_login, p.twitch_display_name,
    case when p.show_first_name then p.first_name end as first_name,
    (p.plan = 'partner' and (p.plan_until is null or p.plan_until > now())) as partner,
    (select c.account_name from public.chat_connections c where c.user_id = p.id and c.platform = 'kick') as kick_name,
    (select c.account_name from public.chat_connections c where c.user_id = p.id and c.platform = 'youtube') as youtube_name,
    (select c.account_id from public.chat_connections c where c.user_id = p.id and c.platform = 'youtube') as youtube_id
  from public.profiles p
  where p.show_on_site and (p.twitch_id is not null or p.twitch is not null);
