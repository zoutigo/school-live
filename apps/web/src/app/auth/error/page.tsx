import { BackLinkButton } from "../../../components/ui/back-link-button";

type ErrorPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getHint(errorCode: string | undefined) {
  if (!errorCode || errorCode === "undefined" || errorCode === "null") {
    return "Erreur OAuth sans code explicite. Verifiez AUTH_SECRET/NEXTAUTH_SECRET, AUTH_URL/NEXTAUTH_URL et les providers actifs.";
  }
  switch (errorCode) {
    case "Configuration":
      return "Configuration NextAuth invalide. Verifiez AUTH_SECRET et les credentials provider.";
    case "AccessDenied":
      return "Acces refuse par le provider ou par les callbacks applicatifs.";
    case "OAuthSignin":
    case "OAuthCallback":
      return "Echec lors du handshake OAuth. Verifiez AUTH_URL/NEXTAUTH_URL et les redirect URIs.";
    case "OAuthAccountNotLinked":
      return "Ce compte provider est deja lie a un autre utilisateur.";
    default:
      return "Consultez les logs serveur [next-auth][error] pour le detail technique.";
  }
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const code = params.error;
  const normalizedCode =
    !code || code === "undefined" || code === "null" ? "UNKNOWN" : code;

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <h1 className="font-heading text-xl font-semibold">
            Erreur d&apos;authentification
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Code:{" "}
            <span className="font-semibold text-text-primary">
              {normalizedCode}
            </span>
          </p>
          <p className="mt-2 text-sm text-text-secondary">{getHint(code)}</p>
          <BackLinkButton href="/" className="mt-5">
            Retour a la connexion
          </BackLinkButton>
        </div>
      </div>
    </div>
  );
}
