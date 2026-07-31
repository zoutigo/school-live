"use client";

import Link from "next/link";
import {
  Building2,
  Check,
  School,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Reveal } from "../../components/marketing/reveal";
import { SiteHeader } from "../../components/marketing/site-header";
import { SiteFooter } from "../../components/marketing/site-footer";
import { useFixedTranslation } from "../../i18n/useTranslation";
import { localizedPath, type MarketingLocale } from "../../lib/seo";

const TIERS: { key: string; icon: LucideIcon; highlight?: boolean }[] = [
  { key: "school", icon: School },
  { key: "group", icon: Building2, highlight: true },
  { key: "custom", icon: Sparkles },
];

export function PricingContent({
  locale = "fr",
}: {
  locale?: MarketingLocale;
}) {
  const { t } = useFixedTranslation(locale);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SiteHeader locale={locale} />

      <main>
        <section className="relative overflow-hidden bg-warm-ivory py-20">
          <div
            aria-hidden="true"
            className="animate-blob-slow absolute -left-24 -top-10 h-80 w-80 rounded-full bg-warm-accent/20 blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-[900px] px-6 text-center lg:px-16">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-warm-accent"
              />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-warm-accent-dark">
                {t("pricingPage.hero.eyebrow")}
              </p>
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-warm-accent"
              />
            </div>
            <h1 className="font-heading text-3xl font-bold text-text-primary md:text-5xl">
              {t("pricingPage.hero.title")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-text-secondary md:text-lg">
              {t("pricingPage.hero.subtitle")}
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden bg-surface py-20">
          <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-16">
            <div className="grid gap-8 lg:grid-cols-3">
              {TIERS.map((tier, index) => {
                const Icon = tier.icon;
                return (
                  <Reveal key={tier.key} delay={index * 100}>
                    <div
                      className={`flex h-full flex-col rounded-[24px] border p-8 shadow-card ${
                        tier.highlight
                          ? "border-primary bg-primary/[0.03]"
                          : "border-border bg-surface"
                      }`}
                    >
                      <span
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                          tier.highlight
                            ? "bg-primary/10 text-primary"
                            : "bg-warm-accent/15 text-warm-accent-dark"
                        }`}
                      >
                        <Icon className="h-6 w-6" strokeWidth={1.75} />
                      </span>
                      <h2 className="mt-6 font-heading text-xl font-bold text-text-primary md:text-2xl">
                        {t(`pricingPage.tiers.${tier.key}.title`)}
                      </h2>
                      <p className="mt-2 text-sm text-text-secondary md:text-base">
                        {t(`pricingPage.tiers.${tier.key}.subtitle`)}
                      </p>
                      <p className="mt-5 font-heading text-lg font-semibold text-text-primary">
                        {t("pricingPage.tiers.priceLabel")}
                      </p>

                      <ul className="mt-5 flex flex-1 flex-col gap-3">
                        {[1, 2, 3, 4].map((n) => (
                          <li
                            key={n}
                            className="flex items-start gap-2.5 text-sm text-text-secondary md:text-base"
                          >
                            <Check
                              className="mt-0.5 h-4 w-4 shrink-0 text-accent-teal-dark"
                              strokeWidth={2.5}
                            />
                            {t(`pricingPage.tiers.${tier.key}.feature${n}`)}
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={localizedPath(locale, "/contact")}
                        className="mt-8"
                      >
                        <Button
                          variant={tier.highlight ? "primary" : "secondary"}
                          className="w-full"
                        >
                          {t("pricingPage.tiers.cta")}
                        </Button>
                      </Link>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal delay={300}>
              <div className="mx-auto mt-14 max-w-2xl rounded-[20px] border border-warm-border bg-warm-surface p-6 text-center">
                <h3 className="font-heading text-base font-semibold text-text-primary">
                  {t("pricingPage.note.title")}
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  {t("pricingPage.note.body")}
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="relative overflow-hidden bg-metal-800 py-20 text-metal-50">
          <div
            aria-hidden="true"
            className="animate-blob animate-blob-delay absolute -bottom-20 left-10 h-72 w-72 rounded-full bg-accent-teal/25 blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-[800px] px-6 text-center lg:px-16">
            <h2 className="font-heading text-3xl font-bold text-surface md:text-4xl">
              {t("pricingPage.cta.title")}
            </h2>
            <p className="mt-4 text-base text-metal-200 md:text-lg">
              {t("pricingPage.cta.subtitle")}
            </p>
            <div className="mt-8 flex justify-center">
              <Link href={localizedPath(locale, "/contact")}>
                <Button className="px-7 py-3.5 text-base">
                  {t("pricingPage.cta.button")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
