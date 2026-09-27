import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import { authErrorMessage } from "@/lib/auth/errors";

export const metadata: Metadata = { title: "Créer un compte", alternates: { canonical: "/inscription" } };

export default async function InscriptionPage({ searchParams }: PageProps<"/inscription">) {
  const { next, erreur } = await searchParams;
  return <AuthCard mode="inscription" next={typeof next === "string" ? next : ""} error={authErrorMessage(typeof erreur === "string" ? erreur : null)} />;
}
