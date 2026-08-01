"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  FolderOpen,
  MessageSquare,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Reveal } from "../../components/marketing/reveal";
import { SiteHeader } from "../../components/marketing/site-header";
import { SiteFooter } from "../../components/marketing/site-footer";
import { useFixedTranslation } from "../../i18n/useTranslation";
import { localizedPath, type MarketingLocale } from "../../lib/seo";

type Tone = "primary" | "teal" | "warm" | "metal";

const TONE_STYLES: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  teal: "bg-accent-teal/10 text-accent-teal-dark",
  warm: "bg-warm-accent/15 text-warm-accent-dark",
  metal: "bg-metal-500/10 text-metal-600",
};

const MODULES: { key: string; icon: LucideIcon; tone: Tone }[] = [
  { key: "notes", icon: ClipboardList, tone: "primary" },
  { key: "schedule", icon: CalendarClock, tone: "teal" },
  { key: "homework", icon: BookOpen, tone: "warm" },
  { key: "schoolLife", icon: ShieldCheck, tone: "metal" },
  { key: "messaging", icon: MessageSquare, tone: "primary" },
  { key: "resources", icon: FolderOpen, tone: "teal" },
];

export function FeaturesContent({
  locale = "fr",
}: {
  locale?: MarketingLocale;
}) {
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
          <div
            aria-hidden="true"
            className="animate-blob-slow absolute -right-20 -top-10 h-80 w-80 rounded-full bg-accent-teal/20 blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-[1000px] px-6 text-center lg:px-16">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-accent-teal"
              />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent-teal">
                {t("featuresPage.hero.eyebrow")}
              </p>
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-accent-teal"
              />
            </div>
            <h1 className="font-heading text-3xl font-bold text-text-primary md:text-5xl">
              {t("featuresPage.hero.title")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-text-secondary md:text-lg">
              {t("featuresPage.hero.subtitle")}
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden bg-surface py-20">
          <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-16 px-6 lg:px-16">
            {MODULES.map((module, index) => {
              const Icon = module.icon;
              const reversed = index % 2 === 1;
              return (
                <Reveal key={module.key} delay={(index % 3) * 80}>
                  <div
                    className={`flex flex-col items-center gap-10 md:flex-row ${
                      reversed ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    <div className="flex w-full justify-center md:w-2/5">
                      <div
                        className={`relative flex h-40 w-40 items-center justify-center rounded-[32px] shadow-card md:h-48 md:w-48 ${TONE_STYLES[module.tone]}`}
                      >
                        <Icon
                          className="h-16 w-16 md:h-20 md:w-20"
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-3/5">
                      <h2 className="font-heading text-2xl font-bold text-text-primary md:text-3xl">
                        {t(`featuresPage.items.${module.key}.title`)}
                      </h2>
                      <p className="mt-3 text-base text-text-secondary md:text-lg">
                        {t(`featuresPage.items.${module.key}.description`)}
                      </p>
                      <ul className="mt-5 flex flex-col gap-2.5">
                        {[1, 2, 3].map((n) => (
                          <li
                            key={n}
                            className="flex items-start gap-2.5 text-sm text-text-secondary md:text-base"
                          >
                            <span
                              aria-hidden="true"
                              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_STYLES[module.tone].split(" ")[1]} bg-current`}
                            />
                            {t(`featuresPage.items.${module.key}.bullet${n}`)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="relative overflow-hidden bg-metal-800 py-20 text-metal-50">
          <div
            aria-hidden="true"
            className="animate-blob-slow absolute -right-24 top-0 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-[800px] px-6 text-center lg:px-16">
            <h2 className="font-heading text-3xl font-bold text-surface md:text-4xl">
              {t("featuresPage.cta.title")}
            </h2>
            <p className="mt-4 text-base text-metal-200 md:text-lg">
              {t("featuresPage.cta.subtitle")}
            </p>
            <div className="mt-8 flex justify-center">
              <Link href={localizedPath(locale, "/tarifs")}>
                <Button className="px-7 py-3.5 text-base">
                  {t("featuresPage.cta.button")}
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
