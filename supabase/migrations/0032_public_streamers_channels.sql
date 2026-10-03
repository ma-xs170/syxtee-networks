-- Mur des streamers de l'accueil : ajoute les chaînes Kick et YouTube VÉRIFIÉES (comptes reliés au Multichat, 0030),
-- en plus de Twitch. Seuls les comptes qui ont coché « Afficher ma chaîne » et lié un Twitch apparaissent, comme avant.
-- La vue lit chat_connections avec les droits de son propriétaire : aucun jeton n'est exposé, seulement le nom et l'identifiant publics.
create or replace view public.public_streamers as
  select p.username, p.avatar_url, p.twitch_id, p.twitch_login, p.twitch_display_name,
    case when p.show_first_name then p.first_name end as first_name,
    (p.plan = 'partner' and (p.plan_until is null or p.plan_until > now())) as partner,
    (select c.account_name from public.chat_connections c where c.user_id = p.id and c.platform = 'kick') as kick_name,
    (select c.account_name from public.chat_connections c where c.user_id = p.id and c.platform = 'youtube') as youtube_name,
    (select c.account_id from public.chat_connections c where c.user_id = p.id and c.platform = 'youtube') as youtube_id
  from public.profiles p
  where p.show_on_site and p.twitch_id is not null;
