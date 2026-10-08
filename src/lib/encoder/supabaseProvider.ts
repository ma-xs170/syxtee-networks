import type { EncoderProvider } from "./provider";

// Squelette du vrai backend (Supabase + temps réel). Pas encore branché : NEXT_PUBLIC_ENCODER_BACKEND=supabase lève une erreur claire.
//
// À implémenter, méthode par méthode :
//  - getEncoders()                : SELECT sur la table `encoders` (RLS : owner_id = auth.uid() ou partage), joint `encoder_status`.
//  - getStats(id)                 : dernière ligne de `encoder_stats` pour l'encodeur.
//  - subscribeStats(id, cb)       : channel Realtime sur `encoder_stats` (INSERT) filtré par encoder_id, renvoie unsubscribe().
//  - setConnectionEnabled(...)    : INSERT dans `encoder_commands` {encoder_id, type:'connection', payload}; l'agent du boîtier l'exécute et acquitte.
//  - startStream / stopStream     : commandes `encoder_commands` type 'stream_start' | 'stream_stop'.
//  - setEncoding / setDestination / switchScene / reboot : commandes dédiées dans `encoder_commands`.
//  - pair(code)                   : réutiliser le flux link_devices (code à 6 caractères -> ligne `encoders` liée au compte).
//
// Tables conseillées : encoders, encoder_connections, encoder_destinations, encoder_scenes, encoder_stats (série temporelle),
// encoder_events (journal), encoder_commands (file de commandes), encoder_shares (accès en lecture seule pour un modérateur).

const notReady = (): never => {
  throw new Error("Le backend Supabase de l'Encodeur n'est pas encore branché (NEXT_PUBLIC_ENCODER_BACKEND=mock).");
};

export const supabaseProvider: EncoderProvider = {
  getEncoders: async () => notReady(),
  getStats: async () => notReady(),
  subscribeStats: () => notReady(),
  setConnectionEnabled: async () => notReady(),
  startStream: async () => notReady(),
  stopStream: async () => notReady(),
  setEncoding: async () => notReady(),
  setDestination: async () => notReady(),
  switchScene: async () => notReady(),
  reboot: async () => notReady(),
  pair: async () => notReady(),
  engine: () => notReady(),
};
