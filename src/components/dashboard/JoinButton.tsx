"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptWorkspaceInviteAction } from "@/app/(dashboard)/dashboard/espaces/actions";

export default function JoinButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await acceptWorkspaceInviteAction(token);
            if (r.error) return setError(r.error);
            router.push("/dashboard");
            router.refresh();
          })
        }
        className="btn btn-primary w-full disabled:opacity-60"
      >
        {pending ? "Un instant…" : "Rejoindre l'espace"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
