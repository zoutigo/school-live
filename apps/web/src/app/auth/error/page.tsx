import { AuthErrorContent } from "./error-content";

type ErrorPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const code = params.error;
  const normalizedCode =
    !code || code === "undefined" || code === "null" ? "UNKNOWN" : code;

  return <AuthErrorContent errorCode={code} normalizedCode={normalizedCode} />;
}
