import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { TermsContent } from "./terms-content";

export const metadata: Metadata = buildMetadata({
  title: "CGU — Scolive",
  description: "Conditions générales d'utilisation de la plateforme Scolive.",
  basePath: "/cgu",
});

export default function TermsPage() {
  return <TermsContent locale="fr" />;
}
