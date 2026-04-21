import Link from "next/link";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

async function verifyEmailToken(
  token: string,
): Promise<{ success: boolean; message: string }> {
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
      return {
        success: true,
        message: json.message ?? "Email vérifié avec succès.",
      };
    }
    return {
      success: false,
      message: json.message ?? "Lien invalide ou expiré.",
    };
  } catch {
    return {
      success: false,
      message: "Impossible de contacter le serveur. Réessayez plus tard.",
    };
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
        <StatusCard
          success={false}
          title="Lien invalide"
          message="Ce lien de vérification est incomplet ou malformé."
        />
      </PageShell>
    );
  }

  const result = await verifyEmailToken(token);

  return (
    <PageShell>
      <StatusCard
        success={result.success}
        title={result.success ? "Email vérifié !" : "Échec de la vérification"}
        message={result.message}
      />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function StatusCard({
  success,
  title,
  message,
}: {
  success: boolean;
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-card text-center">
      <div
        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
          success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        }`}
      >
        {success ? "✓" : "✗"}
      </div>
      <h1 className="font-heading text-xl font-semibold text-text-primary">
        {title}
      </h1>
      <p className="mt-2 text-sm text-text-secondary">{message}</p>
      {success && (
        <p className="mt-3 text-sm text-text-secondary">
          Vous pouvez maintenant utiliser votre adresse email pour vous
          connecter.
        </p>
      )}
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
