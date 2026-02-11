import type { ReactNode } from "react";
import { SchoolProvider } from "./school-context";
import { getSchoolBranding } from "./school-api";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const branding = await getSchoolBranding(schoolSlug);

  return <SchoolProvider branding={branding}>{children}</SchoolProvider>;
}
