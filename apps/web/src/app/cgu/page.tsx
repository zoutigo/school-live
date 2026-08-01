import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { getPublicLegalDocument } from "../../lib/site-content";
import { TermsContent } from "./terms-content";

export const metadata: Metadata = buildMetadata({
  title: "CGU — Scolive",
  description: "Conditions générales d'utilisation de la plateforme Scolive.",
  basePath: "/cgu",
});

export default async function TermsPage() {
  const doc = await getPublicLegalDocument("cgu", "fr");
  const updatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date(doc.updatedAt));

  return (
    <TermsContent
      locale="fr"
      title={doc.title}
      bodyHtml={doc.contentHtml}
      updatedAt={updatedAt}
    />
  );
}
