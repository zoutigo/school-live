"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BackLinkButton } from "../../../components/ui/back-link-button";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { useTranslation } from "../../../i18n/useTranslation";
import type { SchoolBranding } from "./school-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export default function SchoolPortalPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { t } = useTranslation();
  const [branding, setBranding] = useState<SchoolBranding | null>(null);

  useEffect(() => {
    void fetch(`${API_URL}/schools/${schoolSlug}/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SchoolBranding | null) => {
        setBranding(
          data ?? { id: schoolSlug, slug: schoolSlug, name: schoolSlug },
        );
      })
      .catch(() => {
        setBranding({ id: schoolSlug, slug: schoolSlug, name: schoolSlug });
      });
  }, [schoolSlug]);

  const schoolName = branding?.name ?? schoolSlug;

  return (
    <div className="site-main-gutter min-h-screen bg-background">
      <div className="mx-auto grid w-full max-w-4xl gap-6">
        <Card title={schoolName} subtitle={t("schoolPortal.subtitle")}>
          <p className="text-text-secondary">{t("schoolPortal.description")}</p>
          <div className="mt-4 flex gap-3">
            <Link href={`/schools/${schoolSlug}/login`}>
              <Button>{t("schoolPortal.loginButton")}</Button>
            </Link>
            <BackLinkButton href="/">
              {t("schoolPortal.backHome")}
            </BackLinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
