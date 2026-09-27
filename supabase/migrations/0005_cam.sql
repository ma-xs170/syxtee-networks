-- SYXTEE Cam : clé caméra par utilisateur (lien /cam?k=… et chemin WHIP). Écrite uniquement par le Core.
-- La Cam publie sur l'emplacement habituel de l'utilisateur (publish_id) : même URL OBS que Moblin.
alter table public.stream_keys add column cam_key text unique;
