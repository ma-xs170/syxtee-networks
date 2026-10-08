"use client";

import { useTransition } from "react";
import { openPortal } from "@/app/(dashboard)/dashboard/abonnement/actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/** « Gérer l'abonnement » : portail client Stripe. L'action redirige en cas de succès, sinon on affiche la raison. */
export default function ManageButton() {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await openPortal();
          if (r?.error) toast(r.error, "error");
        })
      }
    >
      Gérer l&apos;abonnement
    </Button>
  );
}
