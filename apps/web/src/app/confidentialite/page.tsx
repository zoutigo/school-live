import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { getPublicLegalDocument } from "../../lib/site-content";
import { PrivacyContent } from "./privacy-content";

export const metadata: Metadata = buildMetadata({
  title: "Confidentialité — Scolive",
  description:
    "Politique de confidentialité et de protection des données personnelles de Scolive.",
  basePath: "/confidentialite",
});

export default async function PrivacyPage() {
  const doc = await getPublicLegalDocument("confidentialite", "fr");
  const updatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date(doc.updatedAt));

  return (
    <PrivacyContent
      locale="fr"
      title={doc.title}
      bodyHtml={doc.contentHtml}
      updatedAt={updatedAt}
    />
  );
}
