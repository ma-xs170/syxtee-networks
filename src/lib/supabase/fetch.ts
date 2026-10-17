// fetch avec délai maximal pour les clients Supabase : si la base ne répond plus, la page échoue vite (et affiche l'écran d'erreur)
// au lieu de rester bloquée jusqu'à la limite de la fonction (300 s). Compatible avec un signal d'annulation déjà fourni.
export function timedFetch(ms: number): typeof fetch {
  return (input, init) => {
    const limit = AbortSignal.timeout(ms);
    return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, limit]) : limit });
  };
}
