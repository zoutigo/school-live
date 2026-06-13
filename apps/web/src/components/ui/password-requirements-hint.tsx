import { useTranslation } from "../../i18n/useTranslation";

type PasswordRequirementsHintProps = {
  password: string;
  className?: string;
};

export function getPasswordChecks(password: string) {
  return [
    { label: "8 caracteres minimum", ok: password.length >= 8 },
    { label: "Au moins 1 majuscule", ok: /[A-Z]/.test(password) },
    { label: "Au moins 1 minuscule", ok: /[a-z]/.test(password) },
    { label: "Au moins 1 chiffre", ok: /\d/.test(password) },
  ];
}

export function PasswordRequirementsHint({
  password,
  className = "",
}: PasswordRequirementsHintProps) {
  const { t } = useTranslation();
  const checks = [
    { label: t("common.passwordHint.minLength"), ok: password.length >= 8 },
    { label: t("common.passwordHint.uppercase"), ok: /[A-Z]/.test(password) },
    { label: t("common.passwordHint.lowercase"), ok: /[a-z]/.test(password) },
    { label: t("common.passwordHint.digit"), ok: /\d/.test(password) },
  ];

  return (
    <div
      className={`rounded-[18px] border border-warm-border bg-warm-surface p-3 shadow-[0_10px_22px_rgba(77,56,32,0.06)] ${className}`.trim()}
    >
      <p className="text-xs text-text-secondary">
        {t("common.passwordHint.title")}
      </p>
      <ul className="mt-2 grid gap-1 text-xs">
        {checks.map((rule) => (
          <li
            key={rule.label}
            className={rule.ok ? "text-primary" : "text-text-secondary"}
          >
            {rule.ok ? "✓ " : "• "}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
