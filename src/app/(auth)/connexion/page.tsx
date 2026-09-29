import type { Metadata } from "next";
import { SignInCard } from "@/components/auth/AuthCard";
import { authErrorMessage } from "@/lib/auth/errors";

export const metadata: Metadata = { title: "Connexion", alternates: { canonical: "/connexion" } };

export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const { next, erreur } = await searchParams;
  return <SignInCard next={typeof next === "string" ? next : ""} error={authErrorMessage(typeof erreur === "string" ? erreur : null)} />;
}
