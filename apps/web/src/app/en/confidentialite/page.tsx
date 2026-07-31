import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { PrivacyContent } from "../../confidentialite/privacy-content";

export const metadata: Metadata = buildMetadata({
  title: "Privacy — Scolive",
  description: "Privacy policy and personal data protection for Scolive.",
  basePath: "/confidentialite",
  locale: "en",
});

export default function PrivacyPageEn() {
  return <PrivacyContent locale="en" />;
}
