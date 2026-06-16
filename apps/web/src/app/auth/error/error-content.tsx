"use client";

import { BackLinkButton } from "../../../components/ui/back-link-button";
import { useTranslation } from "../../../i18n/useTranslation";

type HintKey =
  | "noCode"
  | "configuration"
  | "accessDenied"
  | "oauthHandshake"
  | "accountNotLinked"
  | "default";

function getHintKey(errorCode: string | undefined): HintKey {
  if (!errorCode || errorCode === "undefined" || errorCode === "null") {
    return "noCode";
  }
  switch (errorCode) {
    case "Configuration":
      return "configuration";
    case "AccessDenied":
      return "accessDenied";
    case "OAuthSignin":
    case "OAuthCallback":
      return "oauthHandshake";
    case "OAuthAccountNotLinked":
      return "accountNotLinked";
    default:
      return "default";
  }
}

type Props = {
  errorCode: string | undefined;
  normalizedCode: string;
};

export function AuthErrorContent({ errorCode, normalizedCode }: Props) {
  const { t } = useTranslation();
  const hintKey = getHintKey(errorCode);

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <h1 className="font-heading text-xl font-semibold">
            {t("authError.title")}
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            {t("authError.codeLabel")}{" "}
            <span className="font-semibold text-text-primary">
              {normalizedCode}
            </span>
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {t(`authError.hint.${hintKey}`)}
          </p>
          <BackLinkButton href="/" className="mt-5">
            {t("recovery.password.backToLogin")}
          </BackLinkButton>
        </div>
      </div>
    </div>
  );
}
