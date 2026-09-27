import type { SupabaseClient } from "@supabase/supabase-js";
import { newStreamIds, type StreamIds } from "./ids.ts";
import type { Sls } from "./sls.ts";

// Clés de stream : table Supabase `stream_keys` (écrite par le Core seulement) + paires déclarées dans le SLS.

export type Mode = "direct" | "regie";
export type KeyRow = StreamIds & { user_id: string; mode: Mode; created_at: string; rotated_at: string | null; cam_key?: string | null };

/** Paire du relais créée par SYXTEE et sans clé correspondante en base. */
export function orphanPair(p: { player: string; description?: string }, known: Set<string>) {
  return /^syxtee(-regie)?:/.test(p.description ?? "") && !known.has(p.player);
}

export function createKeyStore(db: SupabaseClient, sls: Sls) {
  async function get(userId: string): Promise<KeyRow | null> {
    const { data, error } = await db.from("stream_keys").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(`stream_keys : ${error.message}`);
    return (data as KeyRow | null) ?? null;
  }

  async function register(userId: string, ids: StreamIds) {
    await sls.addStreamId(ids.publish_id, ids.play_id, `syxtee:${userId}`);
    try {
      await sls.addStreamId(ids.out_publish_id, ids.out_play_id, `syxtee-regie:${userId}`);
    } catch (e) {
      await sls.deleteStreamId(ids.play_id).catch(() => {});
      throw e;
    }
  }

  async function unregister(row: StreamIds) {
    await sls.deleteStreamId(row.play_id);
    await sls.deleteStreamId(row.out_play_id);
  }

  return {
    get,

    /** Renvoie la clé existante ou en crée une (SLS d'abord, puis base ; annulation si la base échoue). */
    async ensure(userId: string): Promise<KeyRow> {
      const existing = await get(userId);
      if (existing) return existing;
      const ids = newStreamIds();
      await register(userId, ids);
      const { data, error } = await db.from("stream_keys").insert({ user_id: userId, ...ids }).select("*").single();
      if (error) {
        await unregister(ids).catch(() => {});
        // Course entre deux requêtes : l'autre a gagné, on relit.
        if (error.code === "23505") return (await get(userId))!;
        throw new Error(`stream_keys insert : ${error.message}`);
      }
      return data as KeyRow;
    },

    /** Nouvelle paire ; l'ancienne est retirée du SLS (Moblin et OBS devront recoller les URLs). */
    async rotate(userId: string): Promise<KeyRow> {
      const old = await get(userId);
      const ids = newStreamIds();
      await register(userId, ids);
      const { data, error } = old
        ? await db.from("stream_keys").update({ ...ids, rotated_at: new Date().toISOString() }).eq("user_id", userId).select("*").single()
        : await db.from("stream_keys").insert({ user_id: userId, ...ids }).select("*").single();
      if (error) {
        await unregister(ids).catch(() => {});
        throw new Error(`stream_keys rotate : ${error.message}`);
      }
      if (old) await unregister(old);
      return data as KeyRow;
    },

    async setMode(userId: string, mode: Mode): Promise<KeyRow> {
      const { data, error } = await db.from("stream_keys").update({ mode }).eq("user_id", userId).select("*").single();
      if (error) throw new Error(`stream_keys mode : ${error.message}`);
      return data as KeyRow;
    },

    /** Supprime les clés : retirées du relais (elles cessent de marcher), puis effacées de la base. */
    async remove(userId: string): Promise<boolean> {
      const row = await get(userId);
      if (!row) return false;
      await unregister(row);
      const { error } = await db.from("stream_keys").delete().eq("user_id", userId);
      if (error) throw new Error(`stream_keys delete : ${error.message}`);
      return true;
    },

    /**
     * Filet de sécurité : retire du relais les paires SYXTEE (description « syxtee… ») qui ne correspondent plus
     * à aucune clé en base (compte supprimé, échec réseau pendant une suppression…). Les paires créées à la main
     * dans l'interface du relais (autre description) ne sont jamais touchées.
     */
    async cleanupOrphans(): Promise<string[]> {
      const { data, error } = await db.from("stream_keys").select("play_id, out_play_id");
      if (error) throw new Error(`stream_keys : ${error.message}`); // base illisible : on ne retire rien
      const rows = (data ?? []) as { play_id: string; out_play_id: string }[];
      const known = new Set(rows.flatMap((r) => [r.play_id, r.out_play_id]));
      const orphans = (await sls.listStreamIds()).filter((p) => orphanPair(p, known)).map((p) => p.player);
      for (const player of orphans) await sls.deleteStreamId(player);
      return orphans;
    },

    async all(): Promise<KeyRow[]> {
      const { data, error } = await db.from("stream_keys").select("*");
      if (error) throw new Error(`stream_keys : ${error.message}`);
      return (data ?? []) as KeyRow[];
    },

    /** Pseudo affiché sur la mire. */
    async username(userId: string): Promise<string> {
      const { data } = await db.from("profiles").select("username").eq("id", userId).maybeSingle();
      return (data?.username as string | undefined) ?? "streamer";
    },
  };
}

export type KeyStore = ReturnType<typeof createKeyStore>;
