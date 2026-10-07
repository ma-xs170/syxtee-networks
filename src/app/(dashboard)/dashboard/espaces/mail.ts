import "server-only";
import { workspaceInvite } from "@/emails/templates";
import { sendEmailResult } from "@/lib/email/send";
import { site } from "@/lib/site";

/** Envoie l'invitation à rejoindre un espace ; renvoie vrai si l'email est parti. Le secret n'est jamais journalisé. */
export async function remoteWorkspaceInvite(to: string, o: { ownerName: string; workspace: string; role: "admin" | "member"; token: string; expires: Date }) {
  const r = await sendEmailResult(to, workspaceInvite({ ownerName: o.ownerName, workspace: o.workspace, role: o.role, url: `${site.url}/rejoindre/${o.token}`, expires: o.expires }));
  return r.ok;
}
