import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { getPublicLegalDocument } from "../../../lib/site-content";
import { LegalNoticeContent } from "../../mentions-legales/legal-notice-content";

export const metadata: Metadata = buildMetadata({
  title: "Legal Notice — Scolive",
  description: "Legal notice for the Scolive platform.",
  basePath: "/mentions-legales",
  locale: "en",
});

export default async function LegalNoticePageEn() {
  const doc = await getPublicLegalDocument("mentions-legales", "en");
  const updatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(new Date(doc.updatedAt));

  return (
    <LegalNoticeContent
      locale="en"
      title={doc.title}
      bodyHtml={doc.contentHtml}
      updatedAt={updatedAt}
    />
  );
}
