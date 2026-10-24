import "server-only";

// Vérification automatique de la photo d'une fiche vidéaste (Claude, vision). Trois issues :
// - ok : une personne visible, rien de choquant → la fiche est publiée tout de suite ;
// - bad : pas un visage, logo, capture d'écran ou contenu inapproprié → refusée avec le motif ;
// - unsure : doute, ou service indisponible → la fiche attend la relecture de l'équipe (jamais publiée sans vérification).

export type PhotoVerdict = { verdict: "ok" | "bad" | "unsure"; reason: string };

const MODEL = "claude-haiku-5-5";
const PROMPT =
  "Tu vérifies la photo de profil d'un vidéaste pour un annuaire professionnel. Réponds uniquement par un objet JSON : " +
  '{"face": true si la photo montre clairement le visage d\'une seule personne réelle, "safe": true si rien n\'est choquant, sexuel, violent, haineux ou illégal, "reason": une phrase courte en français}. ' +
  "face vaut false pour un logo, un dessin, un paysage, une capture d'écran, une photo de groupe ou une photo trop floue.";

export async function reviewPhoto(url: string): Promise<PhotoVerdict> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { verdict: "unsure", reason: "Vérification automatique indisponible." };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [{ role: "user", content: [{ type: "image", source: { type: "url", url } }, { type: "text", text: PROMPT }] }],
      }),
    });
    if (!res.ok) return { verdict: "unsure", reason: "Vérification automatique indisponible." };
    const body = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = body.content?.find((b) => b.type === "text")?.text ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { face?: unknown; safe?: unknown; reason?: unknown };
    const reason = typeof json.reason === "string" ? json.reason.slice(0, 200) : "";
    if (json.safe === false) return { verdict: "bad", reason: reason || "Photo inappropriée." };
    if (json.face === false) return { verdict: "bad", reason: reason || "La photo doit montrer ton visage." };
    return json.face === true && json.safe === true ? { verdict: "ok", reason } : { verdict: "unsure", reason };
  } catch {
    return { verdict: "unsure", reason: "Vérification automatique indisponible." };
  }
}
