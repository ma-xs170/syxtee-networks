// Planning de production : détection des conflits, sans dépendance (testée en Node).

type Live = { id: string; assignee_id: string | null; starts_at: string; ends_at: string };

/** Lives en conflit : la même personne est prévue sur deux lives qui se chevauchent. Renvoie les identifiants concernés. */
export function conflicts(events: Live[]): Set<string> {
  const out = new Set<string>();
  const byPerson = new Map<string, typeof events>();
  for (const e of events) if (e.assignee_id) byPerson.set(e.assignee_id, [...(byPerson.get(e.assignee_id) ?? []), e]);
  for (const list of byPerson.values()) {
    const sorted = [...list].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
    let last: (typeof sorted)[number] | null = null;
    for (const e of sorted) {
      if (last && Date.parse(e.starts_at) < Date.parse(last.ends_at)) {
        out.add(e.id);
        out.add(last.id);
      }
      if (!last || Date.parse(e.ends_at) > Date.parse(last.ends_at)) last = e;
    }
  }
  return out;
}
