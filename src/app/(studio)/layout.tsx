// Contrôle à distance d'un OBS : plein écran, sans nav ni footer du site.
export default function StudioLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
