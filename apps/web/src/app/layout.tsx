import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RuntimeErrorRecovery } from "../components/runtime-error-recovery";
import { LocaleHtmlSync } from "../i18n/LocaleHtmlSync";
import { SITE_URL } from "../lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Scolive — Plateforme scolaire moderne et collaborative",
  description:
    "Notes, emploi du temps, devoirs, vie scolaire, messagerie et ressources pédagogiques : la plateforme scolaire moderne et collaborative pour les écoles de Yaoundé, Douala, Bafoussam et de tout le Cameroun.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <LocaleHtmlSync />
        <RuntimeErrorRecovery />
        {children}
      </body>
    </html>
  );
}
