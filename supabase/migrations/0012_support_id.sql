-- SYXTEE : identifiant support unique par compte (SYX-XXXX-XXXX).
-- À exécuter sur le projet de production ET sur le projet de test.
--
-- Alphabet de 32 signes sans 0/O/1/I (lecture au téléphone ou dans un ticket sans ambiguïté).
-- 8 signes tirés avec pgcrypto (40 bits aléatoires) : non devinable, sans lien avec l'ID, l'email ou la date.
-- L'utilisateur ne peut pas le modifier (droits de mise à jour de 0001 limités à d'autres colonnes).

create function public.new_support_id() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  b bytea;
  s text;
begin
  loop
    b := extensions.gen_random_bytes(8);
    s := '';
    for i in 0..7 loop
      s := s || substr(alphabet, (get_byte(b, i) & 31) + 1, 1);
    end loop;
    s := 'SYX-' || left(s, 4) || '-' || right(s, 4);
    exit when not exists (select 1 from public.profiles where support_id = s);
  end loop;
  return s;
end $$;

revoke execute on function public.new_support_id() from public, anon, authenticated;

alter table public.profiles add column support_id text;

-- Comptes existants : un ID chacun (rétroactif).
update public.profiles set support_id = public.new_support_id() where support_id is null;

-- Nouveaux comptes : posé à la création du profil (handle_new_user).
alter table public.profiles
  alter column support_id set default public.new_support_id(),
  alter column support_id set not null,
  add constraint profiles_support_id_format check (support_id ~ '^SYX-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$'),
  add constraint profiles_support_id_key unique (support_id);
