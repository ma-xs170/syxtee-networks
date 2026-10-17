"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { product } from "@/config/product";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Boutique : achat d'un article (paiement unique) par Stripe Checkout. Le code d'activation de l'Encodeur est créé par le webhook
// une fois le paiement confirmé (jamais ici). Variables : STRIPE_SECRET_KEY, STRIPE_PRICE_ENCODER, STRIPE_PRICE_SAC_MESH.

type ShippingCountry = "FR" | "GP" | "MQ" | "MF";
export type ShopState = { error?: string };
const PRICE = { encoder: "STRIPE_PRICE_ENCODER", "sac-mesh": "STRIPE_PRICE_SAC_MESH" } as const;
type Product = keyof typeof PRICE;

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export async function startProductCheckout(productId: string, quantity = 1): Promise<ShopState> {
  const user = await requireUser("/boutique");
  if (!(productId in PRICE)) return { error: "Article inconnu." };
  const price = process.env[PRICE[productId as Product]];
  if (!process.env.STRIPE_SECRET_KEY || !price) return { error: "Les commandes ouvrent bientôt. Demande ton accès pour être prévenu." };
  const qty = Math.max(1, Math.min(5, Math.floor(quantity) || 1));
  const profile = await getProfile();
  const base = await origin();
  let url: string | null;
  try {
    let customer = profile?.stripe_customer_id ?? undefined;
    if (!customer) {
      const created = await stripe().customers.create({ email: user.email ?? undefined, name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || undefined, metadata: { user_id: user.id } });
      await createAdminClient().from("profiles").update({ stripe_customer_id: created.id }).eq("id", user.id).is("stripe_customer_id", null);
      customer = created.id;
    }
    // Double clic : même clé pendant 30 min pour le même article et la même quantité, donc une seule session de paiement.
    const idempotencyKey = `shop-${user.id}-${productId}-${qty}-${Math.floor(Date.now() / 1_800_000)}`;
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: qty }],
      locale: "fr",
      // Livraison : France, Guadeloupe, Martinique, Saint-Martin (liste dans product.shipping).
      shipping_address_collection: { allowed_countries: product.shipping.map((c) => c.cc) as ShippingCountry[] },
      phone_number_collection: { enabled: true },
      metadata: { product: productId === "encoder" ? "encoder" : "accessory", item: productId, quantity: String(qty) },
      success_url: `${base}/boutique?commande=ok`,
      cancel_url: `${base}/boutique#${productId === "encoder" ? "encodeur" : "sac-mesh"}`,
    }, { idempotencyKey });
    url = session.url;
  } catch (e) {
    console.error("startProductCheckout", e instanceof Error ? e.message : e);
    return { error: "Le paiement ne répond pas. Réessaie dans un instant." };
  }
  if (!url) return { error: "Le paiement ne répond pas. Réessaie dans un instant." };
  redirect(url);
}
