import type { Metadata } from "next";
import Studio from "@/components/studio/Studio";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { loadRelays } from "@/lib/relays";

export const metadata: Metadata = { title: "SYXTEE STUDIO", robots: { index: false } };

// SYXTEE STUDIO : notre propre régie, plein écran, dans le navigateur. Les relais du compte sont proposés comme sources.
export default async function StudioPage() {
  const user = await requireUser("/studio");
  const { relays } = await loadRelays(user.id);
  const sources = relays.filter((r) => !r.archived).map((r) => ({ id: r.id, name: r.name, live: r.live }));
  return <Studio relays={sources} coreUrl={publicCoreUrl} />;
}
