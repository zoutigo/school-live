import type { Metadata } from "next";
import { LegalNoticeContent } from "./legal-notice-content";

export const metadata: Metadata = {
  title: "Mentions légales — Scolive",
  description: "Mentions légales de la plateforme Scolive.",
};

export default function LegalNoticePage() {
  return <LegalNoticeContent />;
}
