"use client";

import { FileText } from "lucide-react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { useTranslation } from "../../i18n/useTranslation";

export type LegalSection = {
  heading: string;
  body: string;
};

export function LegalPageLayout({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden bg-warm-ivory py-16">
          <div className="relative mx-auto w-full max-w-[800px] px-6 text-center lg:px-16">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-accent/15 text-warm-accent-dark">
              <FileText className="h-6 w-6" />
            </span>
            <h1 className="mt-5 font-heading text-3xl font-bold text-text-primary md:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm font-medium text-text-secondary">
              {t("legal.lastUpdated")} {updatedAt}
            </p>
            <p className="mx-auto mt-5 max-w-xl text-sm text-text-secondary">
              {intro}
            </p>
          </div>
        </section>

        <section className="bg-surface py-16">
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-8 px-6 lg:px-16">
            {sections.map((section) => (
              <div key={section.heading}>
                <h2 className="font-heading text-lg font-semibold text-text-primary">
                  {section.heading}
                </h2>
                <p className="mt-2 text-sm text-text-secondary md:text-base">
                  {section.body}
                </p>
              </div>
            ))}

            <div className="rounded-[16px] border border-warm-border bg-warm-surface p-5 text-sm text-text-secondary">
              {t("legal.placeholderNotice")}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
