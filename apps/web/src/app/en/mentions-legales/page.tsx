import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { LegalNoticeContent } from "../../mentions-legales/legal-notice-content";

export const metadata: Metadata = buildMetadata({
  title: "Legal Notice — Scolive",
  description: "Legal notice for the Scolive platform.",
  basePath: "/mentions-legales",
  locale: "en",
});

export default function LegalNoticePageEn() {
  return <LegalNoticeContent locale="en" />;
}
