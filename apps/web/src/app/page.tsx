import type { Metadata } from "next";
import { buildMetadata } from "../lib/seo";
import { LandingContent } from "./landing-content";

export const metadata: Metadata = buildMetadata({
  title: "Scolive — Plateforme scolaire moderne et collaborative",
  description:
    "Notes, emploi du temps, devoirs, vie scolaire, messagerie et ressources pédagogiques : la plateforme scolaire moderne et collaborative pour les écoles de Yaoundé, Douala, Bafoussam et de tout le Cameroun.",
  basePath: "/",
});

export default function LandingPage() {
  return <LandingContent locale="fr" />;
}
