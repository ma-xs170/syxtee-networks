// supabase-js pèse ~260 Ko : chargé à la demande, hors du JS de premier affichage.
type Client = ReturnType<typeof import("./client").createClient>;
let client: Promise<Client> | null = null;

export function supabaseClient(): Promise<Client> {
  client ??= import("./client").then((m) => m.createClient());
  return client;
}
