import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ schoolSlug: string }>;
};

export default async function SchoolLoginPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  redirect(`/?schoolSlug=${encodeURIComponent(schoolSlug)}`);
}
