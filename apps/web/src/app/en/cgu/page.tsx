import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { getPublicLegalDocument } from "../../../lib/site-content";
import { TermsContent } from "../../cgu/terms-content";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service — Scolive",
  description: "Terms of service for the Scolive platform.",
  basePath: "/cgu",
  locale: "en",
});

export default async function TermsPageEn() {
  const doc = await getPublicLegalDocument("cgu", "en");
  const updatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(new Date(doc.updatedAt));

  return (
    <TermsContent
      locale="en"
      title={doc.title}
      bodyHtml={doc.contentHtml}
      updatedAt={updatedAt}
    />
  );
}
