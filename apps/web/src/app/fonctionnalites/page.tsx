import type { Metadata } from "next";
import { FeaturesContent } from "./features-content";

export const metadata: Metadata = {
  title: "Fonctionnalités — Scolive",
  description:
    "Notes, emploi du temps, devoirs, vie scolaire, messagerie et ressources pédagogiques : découvrez tout ce que Scolive apporte aux écoles du Cameroun.",
};

export default function FeaturesPage() {
  return <FeaturesContent />;
}
