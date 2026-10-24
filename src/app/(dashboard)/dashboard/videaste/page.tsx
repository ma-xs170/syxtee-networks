import type { Metadata } from "next";
import { DashPage } from "@/components/dashboard/ui";
import { Card } from "@/components/ui/Card";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { regionList } from "@/lib/regions";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import type { CardStatus, PriceUnit } from "@/lib/videaste";
import { BecomeVideaste, CardForm } from "./VideasteForm";

export const metadata: Metadata = { title: "Ma fiche vidéaste", robots: { index: false } };

type Row = { display_name: string; region: string; country: string; price_from: number | null; price_to: number | null; price_unit: PriceUnit; bio: string; specialties: string[]; status: CardStatus; review_note: string | null };

export default async function VideastePage() {
  const user = await requireUser("/dashboard/videaste");
  const profile = await getProfile();
  // Colonne et table créées par la migration 0066 (lues par le serveur : aucune politique) : sans elles, la page propose d'activer le compte.
  const db = hasAdmin ? createAdminClient() : null;
  const { data: acc } = db ? await db.from("profiles").select("account_type").eq("id", user.id).maybeSingle() : { data: null };
  const isVideaste = (acc as { account_type?: string } | null)?.account_type === "videaste";
  const { data } = db && isVideaste ? await db.from("videographer_cards").select("display_name, region, country, price_from, price_to, price_unit, bio, specialties, status, review_note").eq("user_id", user.id).maybeSingle() : { data: null };
  const row = data as Row | null;
  // Messages reçus par l'annuaire (table de la migration 0067).
  const { data: inbox } = db && isVideaste ? await db.from("videographer_messages").select("id, from_name, from_email, body, created_at").eq("card_user_id", user.id).order("created_at", { ascending: false }).limit(30) : { data: null };
  const messages = (inbox ?? []) as { id: string; from_name: string; from_email: string; body: string; created_at: string }[];
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const countries = regionList().map((r) => ({ code: r.code, name: `${r.flag} ${r.name}` }));

  return (
    <DashPage>
      <h1 className="h-page mb-8">Ma fiche <em>vidéaste</em></h1>
      <Card title={isVideaste ? "Ta fiche dans l'annuaire" : "Rejoindre l'annuaire des vidéastes"}>
        {isVideaste ? (
          <CardForm
            avatar={profile?.avatar_url ?? null}
            countries={countries}
            status={row?.status ?? "draft"}
            note={row?.review_note ?? null}
            values={{
              displayName: row?.display_name ?? name,
              region: row?.region ?? "",
              country: row?.country ?? profile?.country ?? "FR",
              priceFrom: row?.price_from ?? null,
              priceTo: row?.price_to ?? null,
              priceUnit: row?.price_unit ?? "journee",
              bio: row?.bio ?? "",
              specialties: (row?.specialties ?? []).join(", "),
            }}
          />
        ) : (
          <BecomeVideaste />
        )}
      </Card>
      {isVideaste && (
        <Card title="Messages reçus">
          {messages.length === 0 ? (
            <p className="text-sm text-muted">Aucun message pour l&apos;instant. Quand un streamer t&apos;écrit depuis l&apos;annuaire, son message arrive ici : réponds-lui directement par e-mail.</p>
          ) : (
            <ul className="divide-y divide-line">
              {messages.map((m) => (
                <li key={m.id} className="py-4">
                  <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{m.from_name} <a href={`mailto:${m.from_email}`} className="font-normal text-muted underline underline-offset-4">{m.from_email}</a></span>
                    <span className="font-mono text-xs text-muted">{new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" })}</span>
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 border-t border-line pt-4 text-xs text-muted">Besoin d&apos;aide ? Les vidéastes publiés ont un accès prioritaire au support : écris-nous depuis le chat du site.</p>
        </Card>
      )}
    </DashPage>
  );
}
