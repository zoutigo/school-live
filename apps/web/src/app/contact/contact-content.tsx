"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { Reveal } from "../../components/marketing/reveal";
import { SiteHeader } from "../../components/marketing/site-header";
import { SiteFooter } from "../../components/marketing/site-footer";
import { ContactForm } from "../../components/marketing/contact-form";
import { useFixedTranslation } from "../../i18n/useTranslation";
import type { MarketingLocale } from "../../lib/seo";
import {
  formatPublicAddress,
  type PublicContactInfo,
} from "../../lib/site-content";

export function ContactContent({
  locale = "fr",
  contactInfo,
}: {
  locale?: MarketingLocale;
  contactInfo: PublicContactInfo;
}) {
  const { t } = useFixedTranslation(locale);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SiteHeader locale={locale} />

      <main>
        <section className="relative overflow-hidden bg-warm-ivory py-20">
          <div
            aria-hidden="true"
            className="animate-blob-slow absolute -right-24 -top-10 h-80 w-80 rounded-full bg-warm-accent/20 blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-[900px] px-6 text-center lg:px-16">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-warm-accent"
              />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-warm-accent-dark">
                {t("contactPage.hero.eyebrow")}
              </p>
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-warm-accent"
              />
            </div>
            <h1 className="font-heading text-3xl font-bold text-text-primary md:text-5xl">
              {t("contactPage.hero.title")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-text-secondary md:text-lg">
              {t("contactPage.hero.subtitle")}
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden bg-surface py-20">
          <div className="mx-auto grid w-full max-w-[1100px] gap-12 px-6 lg:grid-cols-5 lg:px-16">
            <Reveal className="lg:col-span-2">
              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-heading text-sm font-semibold text-text-primary">
                      {t("contactPage.info.emailLabel")}
                    </p>
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="text-sm text-text-secondary hover:text-primary hover:underline"
                    >
                      {contactInfo.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-teal/10 text-accent-teal-dark">
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-heading text-sm font-semibold text-text-primary">
                      {t("contactPage.info.phoneLabel")}
                    </p>
                    <a
                      href={`tel:${contactInfo.phone.replace(/\s+/g, "")}`}
                      className="text-sm text-text-secondary hover:text-primary hover:underline"
                    >
                      {contactInfo.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warm-accent/15 text-warm-accent-dark">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-heading text-sm font-semibold text-text-primary">
                      {t("contactPage.info.locationLabel")}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {formatPublicAddress(contactInfo)}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100} className="lg:col-span-3">
              <ContactForm locale={locale} />
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
