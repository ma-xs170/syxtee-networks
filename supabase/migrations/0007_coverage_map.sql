-- SYXTEE : compteurs publics de la carte de couverture (/couverture).
-- Contributeurs = identifiants d'appareil distincts sur 90 jours (anonymes). Surface : hexagones H3 rés. 9 publiés (~0,105 km²).

create function public.coverage_stats() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'hexes', (select count(*) from public.coverage_hex where published and operator = '*' and tech = '*'),
    'km2', round((select count(*) from public.coverage_hex where published and operator = '*' and tech = '*') * 0.1053, 1),
    'measurements', (select coalesce(sum(n), 0) from public.coverage_hex where operator = '*' and tech = '*'),
    'contributors', (select count(distinct device_hash) from public.measurements)
  );
$$;

revoke execute on function public.coverage_stats() from public;
grant execute on function public.coverage_stats() to anon, authenticated, service_role;
