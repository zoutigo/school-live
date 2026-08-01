import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { PricingContent } from "../../tarifs/pricing-content";

export const metadata: Metadata = buildMetadata({
  title: "Pricing — Scolive",
  description:
    "Plans tailored to your school's size, in Yaoundé, Douala or anywhere in Cameroon: independent school, school group or custom needs. Contact us for a quote.",
  basePath: "/tarifs",
  locale: "en",
});

export default function PricingPageEn() {
  return <PricingContent locale="en" />;
}
