import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { TermsContent } from "../../cgu/terms-content";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service — Scolive",
  description: "Terms of service for the Scolive platform.",
  basePath: "/cgu",
  locale: "en",
});

export default function TermsPageEn() {
  return <TermsContent locale="en" />;
}
