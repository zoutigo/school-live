import type { Metadata } from "next";
import { buildMetadata } from "../../lib/seo";
import { BlogContent } from "./blog-content";

export const metadata: Metadata = buildMetadata({
  title: "Blog — Scolive",
  description:
    "Articles et conseils sur la digitalisation de la vie scolaire, la pédagogie et l'organisation des écoles au Cameroun.",
  basePath: "/blog",
});

export default function BlogPage() {
  return <BlogContent locale="fr" />;
}
