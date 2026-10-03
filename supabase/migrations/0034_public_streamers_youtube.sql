-- Mur de l'accueil : ajoute le pseudo YouTube saisi à l'inscription (lien youtube.com/@pseudo), en plus de la chaîne YouTube
-- vérifiée par compte relié (youtube_name / youtube_id). Même règle d'affichage : case « Afficher ma chaîne » cochée.
create or replace view public.public_streamers as
  select p.username, p.avatar_url, p.twitch_id, coalesce(p.twitch_login, p.twitch) as twitch_login, p.twitch_display_name,
    case when p.show_first_name then p.first_name end as first_name,
    (p.plan = 'partner' and (p.plan_until is null or p.plan_until > now())) as partner,
    (select c.account_name from public.chat_connections c where c.user_id = p.id and c.platform = 'kick') as kick_name,
    (select c.account_name from public.chat_connections c where c.user_id = p.id and c.platform = 'youtube') as youtube_name,
    (select c.account_id from public.chat_connections c where c.user_id = p.id and c.platform = 'youtube') as youtube_id,
    p.youtube as youtube_handle
  from public.profiles p
  where p.show_on_site and (p.twitch_id is not null or p.twitch is not null);
