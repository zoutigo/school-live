import type { ReactNode } from 'react';
import { SchoolProvider } from './school-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type SchoolBranding = {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

async function getBranding(schoolSlug: string): Promise<SchoolBranding> {
  const response = await fetch(`${API_URL}/schools/${schoolSlug}/public`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    return {
      id: schoolSlug,
      slug: schoolSlug,
      name: schoolSlug
    };
  }

  return (await response.json()) as SchoolBranding;
}

export default async function SchoolLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const branding = await getBranding(schoolSlug);

  return (
    <SchoolProvider branding={branding}>
      <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>{branding.name}</h1>
          <small>/schools/{branding.slug}</small>
        </header>
        {children}
      </main>
    </SchoolProvider>
  );
}
