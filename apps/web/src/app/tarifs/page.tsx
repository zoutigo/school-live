import type { Metadata } from "next";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
  title: "Tarifs — Scolive",
  description:
    "Des offres adaptées à la taille de votre établissement : école indépendante, groupe scolaire ou besoins sur mesure. Contactez-nous pour un devis.",
};

export default function PricingPage() {
  return <PricingContent />;
}
