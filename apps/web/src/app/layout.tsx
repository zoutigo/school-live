import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RuntimeErrorRecovery } from "../components/runtime-error-recovery";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scolive",
  description: "Plateforme scolaire inspiree d EcoleDirecte",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <RuntimeErrorRecovery />
        {children}
      </body>
    </html>
  );
}
