import type { Metadata } from "next";
import { ContactContent } from "./contact-content";

export const metadata: Metadata = {
  title: "Contact — Scolive",
  description:
    "Une question, un projet de digitalisation pour votre école au Cameroun ? Contactez l'équipe Scolive.",
};

export default function ContactPage() {
  return <ContactContent />;
}
