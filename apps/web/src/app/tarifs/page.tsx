import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = buildMetadata({
  title: "Tarifs — Scolive",
  description:
    "Des offres adaptées à la taille de votre établissement, à Yaoundé, Douala ou ailleurs au Cameroun : école indépendante, groupe scolaire ou besoins sur mesure. Contactez-nous pour un devis.",
  basePath: "/tarifs",
});

export default function PricingPage() {
  return <PricingContent locale="fr" />;
}
