import type { MetadataRoute } from "next";
import { localizedPath, SITE_URL } from "../lib/seo";

const MARKETING_ROUTES: Array<{
  basePath: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { basePath: "/", changeFrequency: "weekly", priority: 1 },
  { basePath: "/fonctionnalites", changeFrequency: "monthly", priority: 0.8 },
  { basePath: "/tarifs", changeFrequency: "monthly", priority: 0.8 },
  { basePath: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { basePath: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { basePath: "/cgu", changeFrequency: "yearly", priority: 0.2 },
  { basePath: "/confidentialite", changeFrequency: "yearly", priority: 0.2 },
  {
    basePath: "/mentions-legales",
    changeFrequency: "yearly",
    priority: 0.2,
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return MARKETING_ROUTES.flatMap(({ basePath, changeFrequency, priority }) => {
    const frUrl = `${SITE_URL}${localizedPath("fr", basePath)}`;
    const enUrl = `${SITE_URL}${localizedPath("en", basePath)}`;
    const alternates = { languages: { fr: frUrl, en: enUrl } };

    return [
      { url: frUrl, lastModified, changeFrequency, priority, alternates },
      {
        url: enUrl,
        lastModified,
        changeFrequency,
        priority: priority * 0.9,
        alternates,
      },
    ];
  });
}
