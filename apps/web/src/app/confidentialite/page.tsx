import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { PrivacyContent } from "./privacy-content";

export const metadata: Metadata = buildMetadata({
  title: "Confidentialité — Scolive",
  description:
    "Politique de confidentialité et de protection des données personnelles de Scolive.",
  basePath: "/confidentialite",
});

export default function PrivacyPage() {
  return <PrivacyContent locale="fr" />;
}
