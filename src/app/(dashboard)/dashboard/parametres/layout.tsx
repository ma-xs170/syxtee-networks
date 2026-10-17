import Link from "next/link";
import { Column } from "@/components/dashboard/kit";
import { ToastProvider } from "@/components/ui/Toast";

// Pages secondaires du compte (Documents, Labs, Équipe, Usage) : le reste vit dans /dashboard/compte.
export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Column>
        <Link href="/dashboard/compte" className="mb-6 inline-block text-[14px] text-muted hover:text-foreground">← Compte</Link>
        <div className="grid gap-6">{children}</div>
      </Column>
    </ToastProvider>
  );
}
