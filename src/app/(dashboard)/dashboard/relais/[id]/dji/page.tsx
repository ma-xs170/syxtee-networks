import { redirect } from "next/navigation";

// Ancienne adresse de l'assistant DJI : les caméras se gèrent maintenant sur /dashboard/dji (relais présélectionné).
export default async function OldDjiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/dji?relais=${encodeURIComponent(id)}`);
}
