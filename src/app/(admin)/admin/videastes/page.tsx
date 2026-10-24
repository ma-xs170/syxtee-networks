import type { Metadata } from "next";
import Image from "next/image";
import { DashHeader, DashPage, Tile } from "@/components/admin/kit";
import { requireAdmin } from "@/lib/admin";
import { flag } from "@/lib/regions";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { priceLabel, type PriceUnit } from "@/lib/videaste";
import { reviewCardAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Vidéastes", robots: { index: false } };

// Fiches en attente : la vérification automatique n'a pas pu trancher (photo douteuse ou service indisponible).

type Row = { user_id: string; display_name: string; region: string; country: string; price_from: number | null; price_to: number | null; price_unit: PriceUnit; bio: string; specialties: string[] };

export default async function AdminVideastesPage() {
  await requireAdmin("partners");
  const db = hasAdmin ? createAdminClient() : null;
  const { data } = db ? await db.from("videographer_cards").select("user_id, display_name, region, country, price_from, price_to, price_unit, bio, specialties").eq("status", "pending").order("updated_at").limit(100) : { data: [] };
  const rows = (data ?? []) as Row[];
  const { data: profiles } = db && rows.length ? await db.from("profiles").select("id, avatar_url").in("id", rows.map((r) => r.user_id)) : { data: [] };
  const photo = new Map(((profiles ?? []) as { id: string; avatar_url: string | null }[]).map((p) => [p.id, p.avatar_url]));
  const { count: published } = db ? await db.from("videographer_cards").select("user_id", { count: "exact", head: true }).eq("status", "published") : { count: 0 };

  return (
    <DashPage>
      <DashHeader kicker="Partenariats" lead="Vidéastes" sub={`${rows.length} fiche${rows.length > 1 ? "s" : ""} à relire · ${published ?? 0} publiée${(published ?? 0) > 1 ? "s" : ""}`} />
      {rows.length === 0 ? (
        <Tile><p className="text-sm text-muted">Aucune fiche en attente.</p></Tile>
      ) : (
        <ul className="grid gap-4">
          {rows.map((r) => {
            const url = photo.get(r.user_id);
            return (
              <li key={r.user_id}>
                <Tile>
                  <div className="flex flex-wrap items-start gap-5">
                    <span className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-foreground/10">
                      {url ? <Image src={url} alt={`Photo de ${r.display_name}`} fill sizes="112px" className="object-cover" /> : <span className="grid size-full place-items-center text-xs text-muted">Sans photo</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">{r.display_name}</h2>
                      <p className="mt-1 text-sm text-muted">{flag(r.country)} {r.region} · <span className="font-mono">{priceLabel({ priceFrom: r.price_from, priceTo: r.price_to, priceUnit: r.price_unit })}</span></p>
                      {r.bio && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{r.bio}</p>}
                      {r.specialties.length > 0 && <p className="mt-2 text-xs text-muted">{r.specialties.join(" · ")}</p>}
                    </div>
                  </div>
                  <form action={reviewCardAction} className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                    <input type="hidden" name="id" value={r.user_id} />
                    <input name="note" placeholder="Motif (obligatoire pour refuser)" maxLength={300} className="h-10 min-w-64 flex-1 rounded-xl border border-line bg-background px-4 text-sm" />
                    <button name="decision" value="approve" className="h-10 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium">Publier</button>
                    <button name="decision" value="reject" className="h-10 whitespace-nowrap rounded-full border border-red-400/40 px-5 text-sm text-red-300 hover:bg-red-400/10">Refuser</button>
                  </form>
                </Tile>
              </li>
            );
          })}
        </ul>
      )}
    </DashPage>
  );
}
