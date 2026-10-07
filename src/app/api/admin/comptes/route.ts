import type { NextRequest } from "next/server";
import { adminOrNull } from "@/lib/admin";
import { listAccounts } from "@/lib/admin-data";
import { audit } from "@/lib/plan-admin";
import { PLANS, type PlanId } from "@/lib/plans";
import { hasAdmin } from "@/lib/supabase/admin";

// Export CSV des comptes (mêmes filtres que /admin/comptes). Admin + TOTP, sinon 404. Chaque export est tracé.

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Guillemets doublés ; préfixe ' devant = + - @ (injection de formules dans les tableurs).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  const admin = await adminOrNull("accounts");
  if (!admin || !hasAdmin) return new Response("Not found", { status: 404 });
  const sp = request.nextUrl.searchParams;
  const filter = { q: sp.get("q") ?? "", plan: sp.get("plan") ?? "", status: sp.get("status") ?? "", live: sp.get("live") === "1", sort: sp.get("sort") ?? "created" };
  const { rows } = await listAccounts({ ...filter, page: 1, perPage: 5000 });
  await audit(admin.email!, "accounts.export_csv", null, null, { filter, rows: rows.length });

  const head = ["id_support", "prenom", "nom", "email", "formule", "fin_formule", "statut", "inscrit_le", "derniere_connexion"];
  const lines = rows.map((r) =>
    [r.support_id, r.first_name, r.last_name, r.email, PLANS[r.plan as PlanId]?.name ?? r.plan, r.plan_until, r.suspended_at ? "suspendu" : "actif", r.created_at, r.last_sign_in_at]
      .map(cell)
      .join(","),
  );
  const csv = "﻿" + [head.join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="syxtee-comptes-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
