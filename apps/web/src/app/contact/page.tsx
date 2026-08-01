import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { getPublicContactInfo } from "../../lib/site-content";
import { ContactContent } from "./contact-content";

export const metadata: Metadata = buildMetadata({
  title: "Contact — Scolive",
  description:
    "Une question, un projet de digitalisation pour votre école à Yaoundé, Douala ou ailleurs au Cameroun ? Contactez l'équipe Scolive.",
  basePath: "/contact",
});

export default async function ContactPage() {
  const contactInfo = await getPublicContactInfo();
  return <ContactContent locale="fr" contactInfo={contactInfo} />;
}
