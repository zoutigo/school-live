import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import {
  getPublicContactInfo,
  getPublicLegalDocument,
} from "../../lib/site-content";
import { LegalNoticeContent } from "./legal-notice-content";

export const metadata: Metadata = buildMetadata({
  title: "Mentions légales — Scolive",
  description: "Mentions légales de la plateforme Scolive.",
  basePath: "/mentions-legales",
});

export default async function LegalNoticePage() {
  const [doc, contact] = await Promise.all([
    getPublicLegalDocument("mentions-legales", "fr"),
    getPublicContactInfo(),
  ]);
  const updatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date(doc.updatedAt));
  const publisherName = [
    contact.legalRepresentativeFirstName,
    contact.legalRepresentativeLastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <LegalNoticeContent
      locale="fr"
      title={doc.title}
      bodyHtml={doc.contentHtml}
      updatedAt={updatedAt}
      publisherName={publisherName || undefined}
    />
  );
}
