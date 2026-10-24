import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { canManage, requireOwner } from "@/lib/workspace";
import AlertSettings from "./AlertSettings";

export const metadata: Metadata = { title: "Paramètres : alertes", robots: { index: false } };

export default async function AlertesPage() {
  const { id, workspace } = await requireOwner("/dashboard/parametres/alertes");
  const supabase = await createClient();
  // Table créée par la migration 0065 : sans elle, la page s'ouvre avec les réglages par défaut.
  const { data } = await supabase.from("alert_settings").select("discord_url, on_drop, on_quota").eq("user_id", id).maybeSingle();
  const row = data as { discord_url: string | null; on_drop: boolean; on_quota: boolean } | null;
  return (
    <Card title="Alertes Discord">
      <p className="mb-6 max-w-[62ch] text-sm leading-relaxed text-muted">Reçois un message sur ton Discord quand ton flux se perd ou quand ton plafond mensuel approche, sans avoir à surveiller le dashboard.</p>
      <AlertSettings initial={{ url: row?.discord_url ?? "", onDrop: row?.on_drop ?? true, onQuota: row?.on_quota ?? true }} canEdit={canManage(workspace)} />
    </Card>
  );
}
