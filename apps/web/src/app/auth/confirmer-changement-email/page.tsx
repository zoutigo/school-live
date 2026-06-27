import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

type ConfirmResult = {
  success: boolean;
  message?: string;
};

async function confirmEmailChange(token: string): Promise<ConfirmResult> {
  try {
    const res = await fetch(
      `${API_URL}/auth/confirm-email-change?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    return { success: res.ok, message: json.message };
  } catch {
    return { success: false };
  }
}

export default async function ConfirmerChangementEmailPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const token = params.token;

  let result: ConfirmResult = {
    success: false,
    message: "Lien manquant. Veuillez relancer la procedure depuis votre compte.",
  };

  if (token) {
    result = await confirmEmailChange(token);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-card text-center">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            result.success
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {result.success ? "✓" : "✗"}
        </div>
        <h1 className="font-heading text-xl font-semibold text-text-primary">
          {result.success
            ? "Adresse email mise a jour"
            : "Lien invalide ou expire"}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {result.message ??
            (result.success
              ? "Votre adresse email a ete modifiee avec succes. Reconnectez-vous avec votre nouvelle adresse."
              : "Ce lien est invalide ou a expire. Veuillez relancer la procedure depuis votre compte.")}
        </p>
        {result.success ? (
          <p className="mt-3 text-sm text-text-secondary">
            Vos sessions actives ont ete revoquees. Reconnectez-vous avec votre nouvelle adresse email.
          </p>
        ) : null}
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Retour a l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
