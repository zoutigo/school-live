import type { ReactNode } from "react";
import { AppShell } from "../../../../components/layout/app-shell";
import { getSchoolBranding } from "../school-api";

export default async function SchoolAppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const branding = await getSchoolBranding(schoolSlug);

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={branding.name}>
      {children}
    </AppShell>
  );
}
