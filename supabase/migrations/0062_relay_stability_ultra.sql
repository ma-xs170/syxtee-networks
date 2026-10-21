-- SYXTEE : nouveau niveau de stabilité « ultra » (tampon SRT de 40 ms), en plus de low, balanced et max.
-- À appliquer AVANT de déployer le Core qui accepte ce niveau.

alter table public.relays drop constraint if exists relays_stability_check;
alter table public.relays add constraint relays_stability_check check (stability in ('ultra', 'low', 'balanced', 'max'));
