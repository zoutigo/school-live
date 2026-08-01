import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { ContactContent } from "./contact-content";

export const metadata: Metadata = buildMetadata({
  title: "Contact — Scolive",
  description:
    "Une question, un projet de digitalisation pour votre école à Yaoundé, Douala ou ailleurs au Cameroun ? Contactez l'équipe Scolive.",
  basePath: "/contact",
});

export default function ContactPage() {
  return <ContactContent locale="fr" />;
}
