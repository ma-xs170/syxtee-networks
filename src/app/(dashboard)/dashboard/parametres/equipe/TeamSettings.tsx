"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteWorkspaceAction, inviteMemberAction, removeMemberAction, renameWorkspaceAction, revokeMemberInviteAction, setMemberRoleAction } from "@/app/(dashboard)/dashboard/espaces/actions";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardFooter } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { DotsThree, Users } from "@/components/icons";

type Member = { id: string; name: string; email: string; role: "owner" | "admin" | "member"; joined: string };
type Invite = { id: string; email: string; role: "admin" | "member"; created: string };
const ROLE: Record<Member["role"], string> = { owner: "Propriétaire", admin: "Admin", member: "Membre" };
const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Paris" });

export default function TeamSettings({ workspace, admin, owner, meId, members, invites }: { workspace: { id: string; name: string; color: string; role: string }; admin: boolean; owner: boolean; meId: string; members: Member[]; invites: Invite[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState(workspace.name);
  const [tab, setTab] = useState<"members" | "apps">("members");
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const dirty = name.trim() !== workspace.name && name.trim().length > 0;

  function run(fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) {
    start(async () => {
      const r = await fn();
      if (r.error) return toast(r.error, "error");
      toast(ok);
      after?.();
      router.refresh();
    });
  }

  return (
    <>
      <Card title="Aperçu">
        <div className="grid gap-6">
          <div className="grid gap-2">
            <span className="text-sm text-muted">Avatar</span>
            <div className="flex flex-wrap items-center gap-4">
              <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-xl font-semibold uppercase text-white">
                {workspace.name.slice(0, 1)}
              </span>
              <Button variant="secondary" disabled title="Bientôt disponible">
                Mettre à jour l&apos;image
              </Button>
              <span className="text-sm text-muted">Taille maximale : 1 Mo. Bientôt disponible.</span>
            </div>
          </div>
          <Input label="Nom de l'équipe" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} disabled={!admin} />
        </div>
        <CardFooter>
          <Button
            variant={dirty ? "primary" : "secondary"}
            disabled={!dirty || !admin}
            loading={pending}
            onClick={() => run(() => renameWorkspaceAction({ id: workspace.id, name: name.trim() }), "Équipe renommée.")}
          >
            Enregistrer
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex gap-1">
            {(
              [
                ["members", "Membres"],
                ["apps", "Apps autorisées"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === id ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
          {admin && tab === "members" && <Button onClick={() => setInviting(true)}>Inviter</Button>}
        </div>

        {tab === "apps" ? (
          <EmptyState icon={<Users weight="light" />} title="Aucune app autorisée pour l'instant" text="Les applications connectées à ton équipe apparaîtront ici." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="pb-3 font-normal">Email</th>
                  <th scope="col" className="pb-3 font-normal">Rôle</th>
                  <th scope="col" className="w-10 pb-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-line transition-colors hover:bg-surface-2/60">
                    <td className="py-4 pr-4">
                      <p className="font-semibold" data-sensitive>{m.email || m.name}</p>
                      <p className="mt-0.5 text-xs text-muted">Rejoint le {date(m.joined)}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge>{ROLE[m.role]}</Badge>
                    </td>
                    <td className="relative py-4 text-right">
                      {owner && m.role !== "owner" && m.id !== meId && (
                        <>
                          <button type="button" aria-label={`Actions pour ${m.email}`} aria-expanded={menu === m.id} onClick={() => setMenu(menu === m.id ? null : m.id)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
                            <DotsThree size={20} weight="bold" aria-hidden="true" />
                          </button>
                          {menu === m.id && (
                            <div role="menu" className="absolute right-0 top-full z-20 w-48 overflow-hidden rounded-xl border border-line bg-surface-2 py-1 text-left shadow-lg">
                              <button type="button" role="menuitem" className="block w-full px-4 py-2 text-left text-sm hover:bg-foreground/10" onClick={() => { setMenu(null); run(() => setMemberRoleAction(m.id, m.role === "admin" ? "member" : "admin"), "Rôle modifié."); }}>
                                {m.role === "admin" ? "Passer en membre" : "Passer en admin"}
                              </button>
                              <button type="button" role="menuitem" className="block w-full px-4 py-2 text-left text-sm text-bad hover:bg-bad/10" onClick={() => { setMenu(null); run(() => removeMemberAction(m.id), "Membre retiré."); }}>
                                Retirer de l&apos;équipe
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {invites.map((i) => (
                  <tr key={i.id} className="border-t border-line">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-muted" data-sensitive>{i.email}</p>
                      <p className="mt-0.5 text-xs text-muted">Invité le {date(i.created)}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge tone="warn">En attente</Badge>
                    </td>
                    <td className="py-4 text-right">
                      {admin && (
                        <button type="button" onClick={() => run(() => revokeMemberInviteAction(i.id), "Invitation annulée.")} className="text-xs text-muted hover:text-foreground">
                          Annuler
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-line pt-3 text-xs text-muted">{members.length} membre{members.length > 1 ? "s" : ""}</p>
          </div>
        )}
      </Card>

      {admin && (
        <>
          <Card title="Exports">
            <p className="text-sm text-muted">Tous les exports CSV disponibles pour ton équipe sont listés ici.</p>
            <div className="mt-5">
              <ButtonLink href="/dashboard/stats">Aller à la page</ButtonLink>
            </div>
          </Card>
          {owner && (
            <Card title="Supprimer l'équipe" className="border-bad/25">
              <p className="text-sm text-muted">Supprime définitivement l&apos;équipe et tout son contenu de SYXTEE NETWORKS.</p>
              <div className="mt-5">
                <Button variant="danger" onClick={() => setDeleting(true)}>Supprimer l&apos;équipe</Button>
              </div>
            </Card>
          )}
        </>
      )}

      <Modal open={inviting} onClose={() => setInviting(false)} title="Inviter un membre">
        <form
          className="mt-4 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => inviteMemberAction({ email, role }), "Invitation envoyée.", () => { setInviting(false); setEmail(""); });
          }}
        >
          <Input label="Adresse e-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="grid gap-2">
            <label htmlFor="inv-role" className="text-sm text-muted">Rôle</label>
            <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")} className="h-11 rounded-xl border border-line bg-input px-3 text-sm">
              <option value="member">Membre</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={pending}>Envoyer l&apos;invitation</Button>
            <Button variant="secondary" onClick={() => setInviting(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleting} onClose={() => { setDeleting(false); setConfirm(""); }} title="Supprimer l'équipe">
        <form
          className="mt-4 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => deleteWorkspaceAction({ id: workspace.id, confirm }), "Équipe supprimée.", () => router.push("/dashboard"));
          }}
        >
          <p className="text-sm text-muted">Cette action est définitive. Tape <strong className="font-semibold text-foreground">{workspace.name}</strong> pour confirmer.</p>
          <Input label="Nom de l'équipe" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          <div className="flex gap-2">
            <Button type="submit" variant="danger" loading={pending} disabled={confirm !== workspace.name}>Supprimer l&apos;équipe</Button>
            <Button variant="secondary" onClick={() => { setDeleting(false); setConfirm(""); }}>Annuler</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
