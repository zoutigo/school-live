"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import { OnboardingTarget } from "../onboarding/onboarding-target";
import { useTranslation } from "../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type ChildFinanceStatus = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
  };
  status:
    | "DECISION_PENDING"
    | "NEXT_YEAR_NOT_OPEN"
    | "ALREADY_REINSCRIBED"
    | "READY_TO_REINSCRIBE";
  targetSchoolYearId?: string;
  targetSchoolYearLabel?: string;
  targetSchoolYearStartsAt?: string | null;
  requiredAmount?: number | null;
  previousClassLabel?: string | null;
  previousLevelLabel?: string | null;
  nextAcademicLevelLabel?: string | null;
  reinscriptionDeadline?: string | null;
};

type InstallmentStatus = "PAID" | "PARTIAL" | "UPCOMING" | "OVERDUE";

type InstallmentRow = {
  id: string;
  rank: number;
  label: string;
  amount: number;
  dueDate: string | null;
  allocatedAmount: number;
  remainingAmount: number;
  status: InstallmentStatus;
};

type ChildInstallmentBreakdown = {
  student: { id: string; firstName: string; lastName: string };
  schoolYearId: string;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  installments: InstallmentRow[];
};

function formatXaf(amount: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

function daysUntil(value: string) {
  const deadline = new Date(value);
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil(
    (Date.UTC(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      msPerDay,
  );
}

const STATUS_TONE: Record<InstallmentStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-700",
  OVERDUE: "bg-red-50 text-red-700",
  UPCOMING: "bg-background text-text-secondary",
};

function InstallmentBreakdown({
  schoolSlug,
  studentId,
  schoolYearId,
}: {
  schoolSlug: string;
  studentId: string;
  schoolYearId: string;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<ChildInstallmentBreakdown | null>(
    null,
  );

  async function toggle() {
    if (!expanded && !breakdown) {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/me/finance/students/${studentId}/schedule?schoolYearId=${schoolYearId}`,
          { credentials: "include" },
        );
        if (response.ok) {
          setBreakdown((await response.json()) as ChildInstallmentBreakdown);
        }
      } finally {
        setLoading(false);
      }
    }
    setExpanded((value) => !value);
  }

  return (
    <div className="mt-3" data-testid={`installment-toggle-${studentId}`}>
      <button
        type="button"
        onClick={toggle}
        className="text-xs font-semibold text-primary"
      >
        {expanded
          ? t("reinscriptionWeb.installments.hide")
          : t("reinscriptionWeb.installments.show")}
      </button>

      {expanded ? (
        loading ? (
          <p className="mt-2 text-xs text-text-secondary">
            {t("common.loading")}
          </p>
        ) : breakdown ? (
          <div
            className="mt-2 grid gap-2"
            data-testid={`installment-list-${studentId}`}
          >
            {breakdown.installments.map((installment) => (
              <div
                key={installment.id}
                className="flex items-start justify-between border-t border-border pt-2"
                data-testid={`installment-row-${studentId}-${installment.rank}`}
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {installment.rank}. {installment.label}
                  </p>
                  {installment.dueDate ? (
                    <p className="text-xs text-text-secondary">
                      {t("reinscriptionWeb.installments.dueDate")}{" "}
                      {formatDate(installment.dueDate)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {formatXaf(installment.amount)}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[installment.status]}`}
                  >
                    {t(
                      `reinscriptionWeb.installments.status.${installment.status}`,
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-text-secondary">
            {t("reinscriptionWeb.installments.error")}
          </p>
        )
      ) : null}
    </div>
  );
}

export function ChildReenrollmentCard({
  schoolSlug,
  child,
  walletBalance,
  submitting,
  onPayAndReinscribe,
  onViewSupplies,
  showInstallmentBreakdown = false,
  reinscribeTourTargetId,
}: {
  schoolSlug: string;
  child: ChildFinanceStatus;
  walletBalance: number;
  submitting: boolean;
  onPayAndReinscribe: (child: ChildFinanceStatus) => void;
  onViewSupplies?: () => void;
  showInstallmentBreakdown?: boolean;
  reinscribeTourTargetId?: string;
}) {
  const { t } = useTranslation();
  const isReady = child.status === "READY_TO_REINSCRIBE";
  const isConfirmed = child.status === "ALREADY_REINSCRIBED";
  // requiredAmount est absent quand aucun echeancier n'est encore configure
  // pour le niveau cible : distinct de 0 (echeancier existant mais integralement
  // paye), pour ne jamais laisser croire a une reinscription gratuite.
  const feeScheduleMissing =
    isReady &&
    (child.requiredAmount === null || child.requiredAmount === undefined);
  const required = child.requiredAmount ?? 0;
  const insufficientBalance =
    isReady && !feeScheduleMissing && walletBalance < required;
  const daysLeft = child.reinscriptionDeadline
    ? daysUntil(child.reinscriptionDeadline)
    : null;

  const hasPromotion = Boolean(
    child.nextAcademicLevelLabel &&
    (child.previousLevelLabel || child.previousClassLabel),
  );

  const reinscribeButton = (
    <Button
      type="button"
      onClick={() => onPayAndReinscribe(child)}
      disabled={submitting || insufficientBalance}
      data-testid={`pay-and-reinscribe-${child.student.id}`}
      className="mt-1 w-full"
    >
      {t("reinscriptionWeb.children.payAndReinscribe")}
    </Button>
  );

  return (
    <article
      className={`rounded-card border p-3 ${
        isConfirmed
          ? "border-emerald-300 bg-emerald-50"
          : isReady
            ? "border-warm-accent"
            : "border-border"
      }`}
      data-testid={`child-reenrollment-card-${child.student.id}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
          {initials(child.student.firstName, child.student.lastName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-heading font-semibold text-text-primary">
            {child.student.firstName} {child.student.lastName}
          </p>
          {hasPromotion ? (
            <p className="truncate text-xs text-text-secondary">
              {child.previousLevelLabel ?? child.previousClassLabel ?? "—"}
              {"  →  "}
              {child.nextAcademicLevelLabel}
            </p>
          ) : null}
        </div>
        {isConfirmed ? (
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("reinscriptionWeb.children.status.ALREADY_REINSCRIBED")}
          </span>
        ) : null}
      </div>

      {child.student.dateOfBirth ? (
        <p className="mt-2 text-xs text-text-secondary">
          {t("reinscriptionWeb.children.dateOfBirth").replace(
            "{date}",
            formatDate(child.student.dateOfBirth),
          )}
        </p>
      ) : null}

      {!isConfirmed ? (
        <div
          className={`mt-2 rounded-card px-3 py-2 text-xs font-semibold ${
            isReady
              ? "bg-amber-100 text-amber-900"
              : "bg-background text-text-secondary"
          }`}
        >
          {t(`reinscriptionWeb.children.status.${child.status}`)}
        </div>
      ) : null}

      {isReady && feeScheduleMissing ? (
        <div
          className="mt-2 rounded-card border border-warm-border bg-warm-surface p-3 text-xs font-semibold text-warm-accent-dark"
          data-testid={`fee-schedule-missing-${child.student.id}`}
        >
          {t("reinscriptionWeb.children.feeScheduleMissing")}
        </div>
      ) : null}

      {isReady && !feeScheduleMissing ? (
        <div className="mt-2 grid gap-1 rounded-card border border-warm-border bg-warm-surface p-3">
          <p className="text-xs font-semibold text-text-secondary">
            {t("reinscriptionWeb.children.required")}
          </p>
          <p className="text-lg font-heading font-bold text-text-primary">
            {formatXaf(required)}
            {child.targetSchoolYearLabel
              ? ` · ${child.targetSchoolYearLabel}`
              : ""}
          </p>

          {daysLeft !== null ? (
            <p
              className={`text-xs font-semibold ${
                daysLeft <= 3 ? "text-red-700" : "text-text-secondary"
              }`}
            >
              {daysLeft >= 0
                ? t("reinscriptionWeb.children.daysLeft").replace(
                    "{count}",
                    String(daysLeft),
                  )
                : t("reinscriptionWeb.children.deadlinePassed")}
              {" — "}
              {formatDate(child.reinscriptionDeadline as string)}
            </p>
          ) : null}

          {child.targetSchoolYearStartsAt ? (
            <p className="text-xs text-text-secondary">
              {t("reinscriptionWeb.children.schoolYearStart").replace(
                "{date}",
                formatDate(child.targetSchoolYearStartsAt),
              )}
            </p>
          ) : null}

          {insufficientBalance ? (
            <p
              className="mt-1 rounded-card bg-red-50 p-2 text-xs font-semibold text-red-700"
              data-testid={`insufficient-balance-${child.student.id}`}
            >
              {t("reinscriptionWeb.children.insufficientBalance").replace(
                "{amount}",
                formatXaf(required - walletBalance),
              )}
            </p>
          ) : null}

          {reinscribeTourTargetId ? (
            <OnboardingTarget id={reinscribeTourTargetId}>
              {reinscribeButton}
            </OnboardingTarget>
          ) : (
            reinscribeButton
          )}
        </div>
      ) : null}

      {isConfirmed ? (
        <div className="mt-2 grid gap-1">
          <p className="text-sm font-heading font-semibold text-emerald-800">
            {t("reinscriptionWeb.children.confirmed.title")}
          </p>
          <p className="text-xs text-text-secondary">
            {t("reinscriptionWeb.children.confirmed.message")}
          </p>
          {child.targetSchoolYearStartsAt ? (
            <p className="text-xs text-text-secondary">
              {t("reinscriptionWeb.children.schoolYearStart").replace(
                "{date}",
                formatDate(child.targetSchoolYearStartsAt),
              )}
            </p>
          ) : null}
          {onViewSupplies ? (
            <button
              type="button"
              onClick={onViewSupplies}
              data-testid={`view-supplies-${child.student.id}`}
              className="justify-self-start text-xs font-semibold text-primary"
            >
              {t("reinscriptionWeb.children.confirmed.viewSupplies")}
            </button>
          ) : null}
        </div>
      ) : null}

      {showInstallmentBreakdown && child.targetSchoolYearId ? (
        <InstallmentBreakdown
          schoolSlug={schoolSlug}
          studentId={child.student.id}
          schoolYearId={child.targetSchoolYearId}
        />
      ) : null}
    </article>
  );
}
