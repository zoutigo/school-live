import type { Metadata } from "next";
import { BlogContent } from "./blog-content";

export const metadata: Metadata = {
  title: "Blog — Scolive",
  description:
    "Articles et conseils sur la digitalisation de la vie scolaire, la pédagogie et l'organisation des écoles au Cameroun.",
};

export default function BlogPage() {
  return <BlogContent />;
}
