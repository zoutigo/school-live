import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/account",
        "/settings",
        "/login",
        "/onboarding",
        "/profile-setup",
        "/first-password",
        "/identifiant-oublie",
        "/mot-de-passe-oublie",
        "/pin-oublie",
        "/compte-en-attente",
        "/auth/",
        "/schools",
        "/messagerie",
        "/tickets",
        "/admin-resources",
        "/admin-tests",
        "/users",
        "/teachers",
        "/classes",
        "/eleves",
        "/enrollments",
        "/salles",
        "/indicators",
        "/subjects",
        "/curriculums",
        "/resources",
        "/acceuil",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
