import type { Metadata } from "next";
import { buildMetadata } from "../../../lib/seo";
import { BlogContent } from "../../blog/blog-content";

export const metadata: Metadata = buildMetadata({
  title: "Blog — Scolive",
  description:
    "Articles and advice on digitalizing school life, pedagogy and school organization in Cameroon.",
  basePath: "/blog",
  locale: "en",
});

export default function BlogPageEn() {
  return <BlogContent locale="en" />;
}
