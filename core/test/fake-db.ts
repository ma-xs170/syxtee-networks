// Faux client Supabase en mémoire (sous-ensemble utilisé par le Core) : select / insert / update / delete,
// filtres eq / is / in / gt / gte, count, single / maybeSingle, contraintes UNIQUE (erreur 23505).

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

export function fakeDb(unique: Record<string, string[]> = {}, defaults: Record<string, () => Row> = {}) {
  const tables = new Map<string, Row[]>();
  const rows = (t: string) => tables.get(t) ?? (tables.set(t, []), tables.get(t)!);

  function violates(t: string, candidate: Row, self?: Row) {
    return (unique[t] ?? []).some((col) => candidate[col] != null && rows(t).some((r) => r !== self && r[col] === candidate[col]));
  }

  function builder(t: string) {
    let op: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row | Row[] | null = null;
    let returning = false;
    let head = false;
    let count = false;
    let mode: "many" | "single" | "maybe" = "many";
    const filters: Filter[] = [];

    function run() {
      const match = rows(t).filter((r) => filters.every((f) => f(r)));
      let out: Row[] = match;
      if (op === "insert") {
        const list = (Array.isArray(payload) ? payload : [payload!]).map((r) => ({ ...(defaults[t]?.() ?? {}), ...r }));
        for (const r of list) if (violates(t, r)) return { data: null, error: { code: "23505", message: "duplicate key" } };
        rows(t).push(...list);
        out = list;
      } else if (op === "update") {
        for (const r of match) if (violates(t, { ...r, ...(payload as Row) }, r)) return { data: null, error: { code: "23505", message: "duplicate key" } };
        for (const r of match) Object.assign(r, payload);
      } else if (op === "delete") {
        tables.set(t, rows(t).filter((r) => !match.includes(r)));
      }
      if (count && head) return { data: null, count: out.length, error: null };
      if (op !== "select" && !returning) return { data: null, error: null };
      const copy = out.map((r) => ({ ...r }));
      if (mode === "single") return copy.length === 1 ? { data: copy[0], error: null } : { data: null, error: { code: "PGRST116", message: `${copy.length} lignes` } };
      if (mode === "maybe") return { data: copy[0] ?? null, error: null };
      return { data: copy, error: null };
    }

    const b = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        if (op !== "select") returning = true;
        if (opts?.count) count = true;
        if (opts?.head) head = true;
        return b;
      },
      insert(p: Row | Row[]) {
        op = "insert";
        payload = p;
        return b;
      },
      upsert(p: Row) {
        const key = Object.keys(p)[0];
        const existing = rows(t).find((r) => r[key] === p[key]);
        if (existing) {
          op = "update";
          payload = p;
          filters.push((r) => r === existing);
        } else {
          op = "insert";
          payload = p;
        }
        return b;
      },
      update(p: Row) {
        op = "update";
        payload = p;
        return b;
      },
      delete() {
        op = "delete";
        return b;
      },
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
      is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), b),
      in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), b),
      gt: (c: string, v: string) => (filters.push((r) => String(r[c]) > v), b),
      gte: (c: string, v: string) => (filters.push((r) => String(r[c]) >= v), b),
      order: () => b,
      limit: () => b,
      single: () => ((mode = "single"), b),
      maybeSingle: () => ((mode = "maybe"), b),
      then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
        try {
          resolve(run());
        } catch (e) {
          reject(e);
        }
      },
    };
    return b;
  }

  return { from: builder, rows, tables };
}

/** Faux SLS (API stream-ids) en mémoire. */
export function fakeSls() {
  const pairs = new Map<string, { publisher: string; player: string; description: string }>();
  return {
    pairs,
    sls: {
      async addStreamId(publisher: string, player: string, description: string) {
        if (pairs.has(player)) throw new Error("409");
        pairs.set(player, { publisher, player, description });
      },
      async deleteStreamId(player: string) {
        pairs.delete(player);
      },
      async listStreamIds() {
        return [...pairs.values()];
      },
      async stats() {
        return null;
      },
    },
  };
}
