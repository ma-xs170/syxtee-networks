import type { Metadata } from "next";
import { ForgotCard } from "@/components/auth/AuthCard";
import { authErrorMessage } from "@/lib/auth/errors";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default async function ForgotPage({ searchParams }: PageProps<"/mot-de-passe-oublie">) {
  const { email, erreur } = await searchParams;
  return <ForgotCard email={typeof email === "string" ? email.slice(0, 254) : ""} error={authErrorMessage(typeof erreur === "string" ? erreur : null)} />;
}
