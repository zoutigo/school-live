"use client";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { LandingLoginForm } from "../components/marketing/landing-login-form";
import { useTranslation } from "../i18n/useTranslation";

export default function LandingPage() {
  const { t } = useTranslation();

  const features = [
    {
      title: t("landing.features.notes.title"),
      description: t("landing.features.notes.description"),
    },
    {
      title: t("landing.features.messaging.title"),
      description: t("landing.features.messaging.description"),
    },
    {
      title: t("landing.features.payments.title"),
      description: t("landing.features.payments.description"),
    },
    {
      title: t("landing.features.schoolLife.title"),
      description: t("landing.features.schoolLife.description"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border bg-surface">
        <div className="site-inline-gutter mx-auto flex w-full max-w-6xl items-center py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-card bg-primary font-heading font-bold text-surface">
              SL
            </span>
            <span className="font-heading text-lg font-semibold">Scolive</span>
          </div>
        </div>
      </header>

      <main>
        <section className="site-inline-gutter mx-auto w-full max-w-6xl pb-6 pt-12">
          <h1 className="font-heading text-3xl font-bold leading-tight text-text-primary md:text-4xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-2 text-sm text-text-secondary md:text-base">
            {t("landing.hero.subtitle")}
          </p>
        </section>

        <section className="site-inline-gutter mx-auto w-full max-w-6xl pb-16">
          <LandingLoginForm />
        </section>

        <section className="site-inline-gutter mx-auto w-full max-w-6xl pb-16">
          <Card
            title={t("landing.mobileApp.title")}
            subtitle={t("landing.mobileApp.subtitle")}
          >
            <p className="mb-4 text-sm text-text-secondary">
              {t("landing.mobileApp.description")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button>{t("landing.mobileApp.appStore")}</Button>
              <a
                href="/api/mobile-builds/android/latest"
                className="inline-flex items-center justify-center gap-2 rounded-card border border-warm-border bg-warm-surface px-4 py-2 text-sm font-heading font-semibold text-primary transition-all duration-200 hover:bg-warm-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t("landing.mobileApp.androidApk")}
              </a>
            </div>
          </Card>
        </section>

        <section className="site-inline-gutter mx-auto w-full max-w-6xl pb-16">
          <Card
            title={t("landing.platform.title")}
            subtitle={t("landing.platform.subtitle")}
          >
            <img
              src="/images/camer-school1.png"
              alt={t("landing.platform.imageAlt")}
              className="h-[380px] w-full rounded-card border border-border object-cover object-center"
            />
            <p className="mt-4 text-sm text-text-secondary">
              {t("landing.platform.description")}
            </p>
          </Card>
        </section>

        <section className="site-inline-gutter mx-auto grid w-full max-w-6xl gap-4 pb-16 md:grid-cols-2">
          {features.map((feature) => (
            <Card
              key={feature.title}
              title={feature.title}
              subtitle={feature.description}
            >
              <p className="text-sm text-text-secondary">
                {t("landing.features.cardFooter")}
              </p>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="site-inline-gutter mx-auto w-full max-w-6xl py-6 text-sm text-text-secondary">
          © {new Date().getFullYear()} Scolive
        </div>
      </footer>
    </div>
  );
}
