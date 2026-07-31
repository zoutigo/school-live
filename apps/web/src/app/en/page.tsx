import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { LandingContent } from "../landing-content";

export const metadata: Metadata = buildMetadata({
  title: "Scolive — Modern, Collaborative School Platform",
  description:
    "Grades, timetable, homework, school life, messaging and learning resources: the modern, collaborative school platform for schools in Yaoundé, Douala, Bafoussam and across Cameroon.",
  basePath: "/",
  locale: "en",
});

export default function LandingPageEn() {
  return <LandingContent locale="en" />;
}
