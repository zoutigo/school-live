"use client";

import { Reveal } from "../../components/marketing/reveal";
import { SiteHeader } from "../../components/marketing/site-header";
import { SiteFooter } from "../../components/marketing/site-footer";
import { useFixedTranslation } from "../../i18n/useTranslation";
import type { MarketingLocale } from "../../lib/seo";

const ARTICLES = [
  { key: "article1", image: "/images/camer-school1.png", tone: "primary" },
  { key: "article2", image: "/images/camer-school2.png", tone: "teal" },
  {
    key: "article3",
    image: "/images/african-classroom-photo.jpg",
    tone: "warm",
  },
  {
    key: "article4",
    image: "/images/african-students-school.svg",
    tone: "metal",
  },
] as const;

const CATEGORY_STYLES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  teal: "bg-accent-teal/10 text-accent-teal-dark",
  warm: "bg-warm-accent/15 text-warm-accent-dark",
  metal: "bg-metal-500/10 text-metal-600",
};

export function BlogContent({ locale = "fr" }: { locale?: MarketingLocale }) {
  const { t } = useFixedTranslation(locale);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SiteHeader locale={locale} />

      <main>
        <section className="relative overflow-hidden bg-teal-surface py-20">
          <div
            aria-hidden="true"
            className="paper-ruled-bg absolute inset-0 opacity-70"
          />
          <div className="relative mx-auto w-full max-w-[900px] px-6 text-center lg:px-16">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-accent-teal"
              />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent-teal">
                {t("blogPage.hero.eyebrow")}
              </p>
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-accent-teal"
              />
            </div>
            <h1 className="font-heading text-3xl font-bold text-text-primary md:text-5xl">
              {t("blogPage.hero.title")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-text-secondary md:text-lg">
              {t("blogPage.hero.subtitle")}
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden bg-surface py-20">
          <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-16">
            <div className="grid gap-8 sm:grid-cols-2">
              {ARTICLES.map((article, index) => (
                <Reveal key={article.key} delay={(index % 2) * 100}>
                  <article className="flex h-full flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-card">
                    <img
                      src={article.image}
                      alt=""
                      aria-hidden="true"
                      className="h-48 w-full object-cover"
                    />
                    <div className="flex flex-1 flex-col p-6">
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${CATEGORY_STYLES[article.tone]}`}
                      >
                        {t(`blogPage.articles.${article.key}.category`)}
                      </span>
                      <h2 className="mt-4 font-heading text-lg font-bold text-text-primary md:text-xl">
                        {t(`blogPage.articles.${article.key}.title`)}
                      </h2>
                      <p className="mt-2 flex-1 text-sm text-text-secondary md:text-base">
                        {t(`blogPage.articles.${article.key}.excerpt`)}
                      </p>
                      <p className="mt-4 text-xs font-medium text-text-secondary">
                        {t(`blogPage.articles.${article.key}.meta`)}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <p className="mx-auto mt-14 max-w-xl text-center text-sm text-text-secondary">
                {t("blogPage.comingSoon")}
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
