-- SYXTEE : corbeille des demandes d'accès. Une demande supprimée dans l'admin reçoit une date (deleted_at) et disparaît des listes ;
-- la tâche quotidienne la supprime pour de bon après 30 jours. À appliquer AVANT de déployer le site.

alter table public.access_requests add column if not exists deleted_at timestamptz;
create index if not exists access_requests_deleted on public.access_requests (deleted_at) where deleted_at is not null;
