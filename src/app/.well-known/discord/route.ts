// Vérification de domaine Discord (Paramètres > Connexions > Connecte ton domaine) :
// https://syxtee-networks.fr/.well-known/discord doit renvoyer exactement cette ligne.
export const dynamic = "force-static";

export function GET() {
  return new Response("dh=bf05ab019e5012d319dc02e5eb01c6385cdbf665", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
