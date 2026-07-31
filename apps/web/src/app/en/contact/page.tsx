import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { ContactContent } from "../../contact/contact-content";

export const metadata: Metadata = buildMetadata({
  title: "Contact — Scolive",
  description:
    "A question, a digitalization project for your school in Yaoundé, Douala or elsewhere in Cameroon? Contact the Scolive team.",
  basePath: "/contact",
  locale: "en",
});

export default function ContactPageEn() {
  return <ContactContent locale="en" />;
}
