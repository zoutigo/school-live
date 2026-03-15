import { redirect } from "next/navigation";

type FirstPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildTargetUrl(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry);
      }
    }
  }

  const serialized = query.toString();
  return serialized ? `/onboarding?${serialized}` : "/onboarding";
}

export default async function FirstPasswordPage({
  searchParams,
}: FirstPasswordPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  redirect(buildTargetUrl(resolvedSearchParams));
}
