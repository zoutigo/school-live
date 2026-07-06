"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { useTranslation } from "../i18n/useTranslation";

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`landing-reveal ${visible ? "landing-reveal-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();

  const features = [
    {
      title: t("landing.features.notes.title"),
      description: t("landing.features.notes.description"),
      iconBg: "bg-primary/10 text-primary",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 19V9M12 19V5M19 19v-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: t("landing.features.messaging.title"),
      description: t("landing.features.messaging.description"),
      iconBg: "bg-accent-teal/10 text-accent-teal-dark",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 5h16v10H8l-4 4V5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: t("landing.features.payments.title"),
      description: t("landing.features.payments.description"),
      iconBg: "bg-warm-accent/15 text-warm-accent-dark",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="6"
            width="18"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      title: t("landing.features.schoolLife.title"),
      description: t("landing.features.schoolLife.description"),
      iconBg: "bg-metal-500/10 text-metal-600",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect
            x="4"
            y="5"
            width="16"
            height="15"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M4 9h16M8 3v4M16 3v4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-text-primary">
      {/* HERO — full viewport image with logo, catchphrase, and CTAs */}
      <section className="relative flex min-h-screen w-full items-center overflow-hidden">
        <img
          src="/images/camer-school1.png"
          alt=""
          aria-hidden="true"
          className="hero-bg-ken-burns absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-metal-900/85 via-primary-dark/55 to-primary-dark/20"
        />

        <div
          aria-hidden="true"
          className="animate-blob-slow absolute -right-20 -top-10 h-80 w-80 rounded-full bg-accent-teal/20 blur-3xl"
        />

        <header className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-[1400px] items-center px-6 py-8 lg:px-16">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-surface font-heading text-lg font-bold text-primary shadow-card">
              SL
            </span>
            <span className="font-heading text-2xl font-bold tracking-tight text-surface drop-shadow-sm md:text-3xl">
              Scolive
            </span>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 py-32 lg:px-16">
          <div className="max-w-3xl lg:max-w-5xl xl:max-w-6xl">
            <div className="mb-6 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-10 shrink-0 bg-warm-accent lg:w-12"
              />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-warm-accent lg:text-base">
                {t("landing.hero.eyebrow")}
              </p>
            </div>
            <h1 className="font-heading text-4xl font-bold leading-tight text-surface drop-shadow-sm md:text-6xl lg:text-7xl">
              {t("landing.hero.catchphrase")}
            </h1>
            <p className="mt-6 max-w-2xl text-base text-surface/85 md:text-lg lg:text-xl">
              {t("landing.hero.subtitle")}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="w-full px-7 py-3.5 text-base sm:w-auto lg:text-lg">
                  {t("landing.hero.loginCta")}
                </Button>
              </Link>
              <a
                href="/api/mobile-builds/android/latest"
                className="inline-flex w-full items-center justify-center gap-2 rounded-card border border-surface/40 bg-surface/10 px-7 py-3.5 text-base font-heading font-semibold text-surface backdrop-blur-sm transition-all duration-200 hover:bg-surface/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface focus-visible:ring-offset-2 sm:w-auto lg:text-lg"
              >
                {t("landing.mobileApp.androidApk")}
              </a>
            </div>
          </div>
        </div>

        {/* Signature: a stylised report card, the artifact every Cameroonian
            family recognises at term's end — anchors the hero in the
            product's real subject instead of a generic decorative shape. */}
        <div
          aria-hidden="true"
          className="bulletin-card absolute bottom-16 right-6 z-10 hidden w-64 rounded-2xl bg-surface p-5 shadow-[0_24px_50px_rgba(22,24,28,0.35)] sm:block md:right-16"
        >
          <div className="flex items-center justify-between">
            <p className="font-heading text-sm font-semibold text-text-primary">
              {t("landing.hero.mock.name")}
            </p>
            <span className="rounded-full bg-teal-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-teal-dark">
              {t("landing.hero.mock.term")}
            </span>
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-wide text-text-secondary">
            {t("landing.hero.mock.average")}
          </p>
          <div className="relative mt-1 inline-block">
            <span className="font-heading text-3xl font-bold text-text-primary">
              {t("landing.hero.mock.score")}
            </span>
            <svg
              viewBox="0 0 120 56"
              className="pointer-events-none absolute -inset-x-3 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+24px)]"
            >
              <path
                className="pen-circle-path"
                d="M8,30 C6,14 30,4 62,4 C96,4 114,14 112,29 C110,45 84,52 58,52 C30,52 10,46 8,30 Z"
                fill="none"
                stroke="#C1443B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent-teal-dark">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10.5 8 14.5 16 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("landing.hero.mock.status")}
          </div>
        </div>

        <div
          aria-hidden="true"
          className="animate-bounce absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-surface/80"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v14m0 0-6-6m6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </section>

      <main>
        {/* PLATFORM — teal-tinted showcase */}
        <section className="relative overflow-hidden bg-teal-surface py-24">
          <div
            aria-hidden="true"
            className="paper-ruled-bg absolute inset-0 opacity-70"
          />

          <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-14 px-6 md:grid-cols-2 lg:gap-24 lg:px-16">
            <Reveal>
              <div className="mb-4 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-8 shrink-0 bg-accent-teal"
                />
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent-teal">
                  {t("landing.hero.eyebrow")}
                </p>
              </div>
              <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl lg:text-5xl">
                {t("landing.platform.title")}
              </h2>
              <p className="mt-4 text-base font-medium text-accent-teal-dark md:text-lg">
                {t("landing.platform.subtitle")}
              </p>
              <p className="mt-5 max-w-lg text-base text-text-secondary md:text-lg">
                {t("landing.platform.description")}
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-accent-teal/30 to-primary/20 blur-xl"
                />
                <img
                  src="/images/camer-school2.png"
                  alt={t("landing.platform.imageAlt")}
                  className="relative h-[420px] w-full rounded-[24px] border border-teal-border object-cover object-center shadow-card lg:h-[480px]"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* APP SHOWCASE — a real device screenshot of the app's navigation
            menu, grounding the "tout en un" promise in the actual product
            rather than an illustration. Chips echo the exact menu items
            visible on screen, so the list and the image tell one story. */}
        <section className="relative overflow-hidden bg-surface py-24">
          <div
            aria-hidden="true"
            className="animate-blob-slow absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-14 px-6 md:grid-cols-2 lg:gap-24 lg:px-16">
            <Reveal className="order-2 flex justify-center md:order-1">
              <div className="relative w-[260px] sm:w-[300px]">
                <div
                  aria-hidden="true"
                  className="absolute -inset-4 rounded-[48px] bg-gradient-to-br from-primary/20 to-accent-teal/20 blur-2xl"
                />
                <div className="relative overflow-hidden rounded-[42px] border-[10px] border-metal-900 bg-metal-900 shadow-[0_30px_60px_rgba(22,24,28,0.35)]">
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-metal-700"
                  />
                  <img
                    src="/images/app-menu-screenshot.png"
                    alt={t("landing.appShowcase.imageAlt")}
                    className="h-auto w-full object-cover"
                  />
                </div>
              </div>
            </Reveal>
            <Reveal delay={150} className="order-1 md:order-2">
              <div className="mb-4 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-8 shrink-0 bg-primary"
                />
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                  {t("landing.appShowcase.eyebrow")}
                </p>
              </div>
              <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl lg:text-5xl">
                {t("landing.appShowcase.title")}
              </h2>
              <p className="mt-5 max-w-lg text-base text-text-secondary md:text-lg">
                {t("landing.appShowcase.description")}
              </p>
              <ul className="mt-8 flex flex-wrap gap-2.5">
                {[
                  t("landing.appShowcase.item1"),
                  t("landing.appShowcase.item2"),
                  t("landing.appShowcase.item3"),
                  t("landing.appShowcase.item4"),
                  t("landing.appShowcase.item5"),
                ].map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-text-secondary"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* FEATURES — four concrete capabilities, each with its own icon
            identity, rather than an arbitrary numbered or bulleted list. */}
        <section className="relative overflow-hidden bg-warm-ivory py-24">
          <div className="relative mx-auto w-full max-w-[1400px] px-6 lg:px-16">
            <Reveal className="mx-auto mb-16 max-w-2xl text-center">
              <div className="mb-3 flex items-center justify-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-8 shrink-0 bg-warm-accent"
                />
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-warm-accent-dark">
                  {t("landing.features.eyebrow")}
                </p>
                <span
                  aria-hidden="true"
                  className="h-px w-8 shrink-0 bg-warm-accent"
                />
              </div>
              <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl lg:text-5xl">
                {t("landing.features.cardFooter")}
              </h2>
            </Reveal>

            <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:gap-8">
              {features.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 80}>
                  <div className="group h-full rounded-[20px] border border-warm-border bg-surface p-8 shadow-card transition-transform duration-300 hover:-translate-y-1">
                    <span
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${feature.iconBg}`}
                    >
                      {feature.icon}
                    </span>
                    <h3 className="mt-6 font-heading text-xl font-semibold text-text-primary lg:text-2xl">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-base text-text-secondary lg:text-lg">
                      {feature.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* MOBILE APP — metal-tinted CTA */}
        <section className="relative overflow-hidden bg-metal-800 py-24 text-metal-50">
          <div
            aria-hidden="true"
            className="animate-blob-slow absolute -right-24 top-0 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="animate-blob animate-blob-delay absolute -bottom-20 left-10 h-72 w-72 rounded-full bg-accent-teal/25 blur-3xl"
          />

          <div className="relative mx-auto w-full max-w-[1400px] px-6 lg:px-16">
            <Reveal className="mx-auto max-w-3xl text-center">
              <h2 className="font-heading text-3xl font-bold text-surface md:text-4xl lg:text-5xl">
                {t("landing.mobileApp.title")}
              </h2>
              <p className="mt-4 text-base text-metal-200 md:text-lg">
                {t("landing.mobileApp.subtitle")}
              </p>
              <p className="mt-4 text-base text-metal-300 md:text-lg">
                {t("landing.mobileApp.description")}
              </p>

              <div className="mt-10 flex justify-center">
                <a
                  href="/api/mobile-builds/android/latest"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-card border border-warm-border bg-warm-surface px-8 py-3.5 text-base font-heading font-semibold text-primary transition-all duration-200 hover:bg-warm-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
                >
                  {t("landing.mobileApp.androidApk")}
                </a>
              </div>
            </Reveal>
          </div>
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
