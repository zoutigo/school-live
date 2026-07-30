import type { Metadata } from "next";
import { PrivacyContent } from "./privacy-content";

export const metadata: Metadata = {
  title: "Confidentialité — Scolive",
  description:
    "Politique de confidentialité et de protection des données personnelles de Scolive.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
