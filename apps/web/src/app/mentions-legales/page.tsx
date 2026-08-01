import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { getPublicLegalDocument } from "../../lib/site-content";
import { LegalNoticeContent } from "./legal-notice-content";

export const metadata: Metadata = buildMetadata({
  title: "Mentions légales — Scolive",
  description: "Mentions légales de la plateforme Scolive.",
  basePath: "/mentions-legales",
});

export default async function LegalNoticePage() {
  const doc = await getPublicLegalDocument("mentions-legales", "fr");
  const updatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date(doc.updatedAt));

  return (
    <LegalNoticeContent
      locale="fr"
      title={doc.title}
      bodyHtml={doc.contentHtml}
      updatedAt={updatedAt}
    />
  );
}
