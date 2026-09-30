import "server-only";
import { getAdminLive, getAdminStats, hasCore, type AdminLive } from "@/lib/core";
import { createAdminClient } from "@/lib/supabase/admin";

// Lectures de l'espace admin (clé secrète, côté serveur, après requireAdmin()).

const DAY = 86_400_000;
const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();

export type LiveRow = AdminLive & { relay_name: string | null; name: string; support_id: string | null };

/** Flux en direct (Core) avec le nom du relais et du compte. */
export async function liveNow(): Promise<LiveRow[]> {
  if (!hasCore) return [];
  let live: AdminLive[] = [];
  try {
    live = await getAdminLive();
  } catch (e) {
    console.error("admin live", e);
  }
  if (!live.length) return [];
  const db = createAdminClient();
  const [{ data: relays }, { data: people }] = await Promise.all([
    db.from("relays").select("id, name").in("id", live.map((l) => l.relay_id)),
    db.from("profiles").select("id, first_name, last_name, support_id").in("id", [...new Set(live.map((l) => l.user_id))]),
  ]);
  return live.map((l) => {
    const p = people?.find((x) => x.id === l.user_id);
    return {
      ...l,
      relay_name: relays?.find((r) => r.id === l.relay_id)?.name ?? null,
      name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "?",
      support_id: p?.support_id ?? null,
    };
  });
}

export async function overview() {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const profiles = () => db.from("profiles").select("id", { count: "exact", head: true });
  const [total, new7, new30, subscribers, relays, relays30, hours, live, stats] = await Promise.all([
    profiles().then((r) => r.count ?? 0),
    profiles().gte("created_at", since(7)).then((r) => r.count ?? 0),
    profiles().gte("created_at", since(30)).then((r) => r.count ?? 0),
    profiles()
      .in("plan", ["paid", "partner"])
      .or(`plan_until.is.null,plan_until.gt.${now}`)
      .then((r) => r.count ?? 0),
    db.from("relays").select("id", { count: "exact", head: true }).eq("archived", false).then((r) => r.count ?? 0),
    db.from("relays").select("id", { count: "exact", head: true }).gte("created_at", since(30)).then((r) => r.count ?? 0),
    db.rpc("admin_live_hours", { p_days: 30 }).then((r) => Number(r.data ?? 0)),
    liveNow(),
    hasCore ? getAdminStats().catch(() => null) : Promise.resolve(null),
  ]);
  return { total, new7, new30, subscribers, relays, relays30, hours, live, stats };
}

export type AccountRow = {
  id: string;
  support_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  plan: string;
  plan_until: string | null;
  suspended_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  total: number;
};

export type AccountFilter = { q?: string; plan?: string; status?: string; live?: boolean; sort?: string; page?: number; perPage?: number };

/** Liste paginée des comptes (recherche email / prénom / nom / ID support, filtres, tri). */
export async function listAccounts(f: AccountFilter) {
  const perPage = f.perPage ?? 50;
  let ids: string[] | null = null;
  if (f.live) ids = [...new Set((await liveNow()).map((l) => l.user_id))];
  if (ids && ids.length === 0) return { rows: [] as AccountRow[], total: 0 };
  const { data, error } = await createAdminClient().rpc("admin_accounts", {
    p_q: f.q?.trim() || null,
    p_plan: f.plan || null,
    p_status: f.status || null,
    p_ids: ids,
    p_sort: f.sort || "created",
    p_limit: perPage,
    p_offset: ((f.page ?? 1) - 1) * perPage,
  });
  if (error) throw new Error(`admin_accounts : ${error.message}`);
  const rows = (data ?? []) as AccountRow[];
  return { rows, total: Number(rows[0]?.total ?? 0) };
}
