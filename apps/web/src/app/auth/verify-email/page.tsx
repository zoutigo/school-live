import { NoTokenStatusCard, PageShell, ResultStatusCard } from "./status-card";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

type VerifyResult = {
  success: boolean;
  message?: string;
  fallbackKey: "verified" | "invalidOrExpired" | "serverError";
};

async function verifyEmailToken(token: string): Promise<VerifyResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  try {
    const res = await fetch(
      `${apiUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
      {
        cache: "no-store",
      },
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, message: json.message, fallbackKey: "verified" };
    }
    return {
      success: false,
      message: json.message,
      fallbackKey: "invalidOrExpired",
    };
  } catch {
    return { success: false, fallbackKey: "serverError" };
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <PageShell>
        <NoTokenStatusCard />
      </PageShell>
    );
  }

  const result = await verifyEmailToken(token);

  return (
    <PageShell>
      <ResultStatusCard
        success={result.success}
        message={result.message}
        fallbackKey={result.fallbackKey}
      />
    </PageShell>
  );
}
