import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { FeaturesContent } from "./features-content";

export const metadata: Metadata = buildMetadata({
  title: "Fonctionnalités — Scolive",
  description:
    "Notes, emploi du temps, devoirs, vie scolaire, messagerie et ressources pédagogiques : découvrez tout ce que Scolive apporte aux écoles de Yaoundé, Douala et du reste du Cameroun.",
  basePath: "/fonctionnalites",
});

export default function FeaturesPage() {
  return <FeaturesContent locale="fr" />;
}
