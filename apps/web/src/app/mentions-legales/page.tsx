import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { LegalNoticeContent } from "./legal-notice-content";

export const metadata: Metadata = buildMetadata({
  title: "Mentions légales — Scolive",
  description: "Mentions légales de la plateforme Scolive.",
  basePath: "/mentions-legales",
});

export default function LegalNoticePage() {
  return <LegalNoticeContent locale="fr" />;
}
