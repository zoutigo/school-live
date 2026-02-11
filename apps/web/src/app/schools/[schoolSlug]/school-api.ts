const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type SchoolBranding = {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

export async function getSchoolBranding(
  schoolSlug: string,
): Promise<SchoolBranding> {
  const response = await fetch(`${API_URL}/schools/${schoolSlug}/public`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      id: schoolSlug,
      slug: schoolSlug,
      name: schoolSlug,
    };
  }

  return (await response.json()) as SchoolBranding;
}
