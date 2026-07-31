import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { FeaturesContent } from "../../fonctionnalites/features-content";

export const metadata: Metadata = buildMetadata({
  title: "Features — Scolive",
  description:
    "Grades, timetable, homework, school life, messaging and learning resources: discover everything Scolive brings to schools in Yaoundé, Douala and the rest of Cameroon.",
  basePath: "/fonctionnalites",
  locale: "en",
});

export default function FeaturesPageEn() {
  return <FeaturesContent locale="en" />;
}
