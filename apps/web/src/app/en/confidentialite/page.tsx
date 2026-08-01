import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { getPublicLegalDocument } from "../../../lib/site-content";
import { PrivacyContent } from "../../confidentialite/privacy-content";

export const metadata: Metadata = buildMetadata({
  title: "Privacy — Scolive",
  description: "Privacy policy and personal data protection for Scolive.",
  basePath: "/confidentialite",
  locale: "en",
});

export default async function PrivacyPageEn() {
  const doc = await getPublicLegalDocument("confidentialite", "en");
  const updatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(new Date(doc.updatedAt));

  return (
    <PrivacyContent
      locale="en"
      title={doc.title}
      bodyHtml={doc.contentHtml}
      updatedAt={updatedAt}
    />
  );
}
