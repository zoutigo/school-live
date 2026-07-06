"use client";

import Link from "next/link";
import { LandingLoginForm } from "../../components/marketing/landing-login-form";
import { useTranslation } from "../../i18n/useTranslation";

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border bg-surface">
        <div className="site-inline-gutter mx-auto flex w-full max-w-6xl items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-card bg-primary font-heading font-bold text-surface">
              SL
            </span>
            <span className="font-heading text-lg font-semibold">Scolive</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("landing.login.backToHome")}
          </Link>
        </div>
      </header>

      <main className="site-inline-gutter mx-auto w-full max-w-6xl py-10">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-text-primary md:text-3xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-2 text-sm text-text-secondary md:text-base">
            {t("landing.hero.subtitle")}
          </p>
        </div>

        <LandingLoginForm />
      </main>
    </div>
  );
}
