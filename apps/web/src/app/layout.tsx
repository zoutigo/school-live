import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RuntimeErrorRecovery } from "../components/runtime-error-recovery";
import { LocaleHtmlSync } from "../i18n/LocaleHtmlSync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scolive",
  description: "Plateforme scolaire moderne et collaborative",
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
