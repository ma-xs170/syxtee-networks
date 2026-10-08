import { DashPage } from "@/components/dashboard/ui";
import { ToastProvider } from "@/components/ui/Toast";
import SettingsTabs from "./SettingsTabs";

// Paramètres : titre, onglets (une route chacun), contenu en cartes empilées.
export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DashPage>
        <h1 className="h-page mb-6">Para<em>mètres</em></h1>
        <SettingsTabs />
        <div className="grid gap-6">{children}</div>
      </DashPage>
    </ToastProvider>
  );
}
