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
    </DashPage>
  );
}
