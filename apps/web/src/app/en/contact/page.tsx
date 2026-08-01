import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { getPublicContactInfo } from "../../../lib/site-content";
import { ContactContent } from "../../contact/contact-content";

export const metadata: Metadata = buildMetadata({
  title: "Contact — Scolive",
  description:
    "A question, a digitalization project for your school in Yaoundé, Douala or elsewhere in Cameroon? Contact the Scolive team.",
  basePath: "/contact",
  locale: "en",
});

export default async function ContactPageEn() {
  const contactInfo = await getPublicContactInfo();
  return <ContactContent locale="en" contactInfo={contactInfo} />;
}
