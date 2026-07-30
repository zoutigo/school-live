import type { Metadata } from "next";
import { TermsContent } from "./terms-content";

export const metadata: Metadata = {
  title: "CGU — Scolive",
  description: "Conditions générales d'utilisation de la plateforme Scolive.",
};

export default function TermsPage() {
  return <TermsContent />;
}
