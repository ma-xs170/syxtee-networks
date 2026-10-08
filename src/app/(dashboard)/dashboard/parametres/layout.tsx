import { DashPage } from "@/components/dashboard/ui";
import { ToastProvider } from "@/components/ui/Toast";
import SettingsTabs from "./SettingsTabs";

// Paramètres : titre, onglets (une route chacun), contenu en cartes empilées.
export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DashPage>
        <h1 className="mb-6 text-3xl font-medium tracking-[-0.03em] sm:text-[32px]">Paramètres</h1>
        <SettingsTabs />
        <div className="grid gap-6">{children}</div>
      </DashPage>
    </ToastProvider>
  );
}
