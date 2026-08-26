"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Wallet } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { Card } from "../../../../../components/ui/card";
import { OnboardingTarget } from "../../../../../components/onboarding/onboarding-target";
import { useTranslation } from "../../../../../i18n/useTranslation";
import { getCsrfTokenCookie } from "../../../../../lib/auth-cookies";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";
import { usePageHelp } from "../../../../../store/page-help";
import {
  REINSCRIPTION_PARENT_TOUR_ID,
  REINSCRIPTION_PARENT_TOUR_STEPS,
  REINSCRIPTION_PARENT_TOUR_TARGETS,
} from "./reinscription-parent-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type MeResponse = {
  role: Role;
  firstName: string;
  lastName: string;
  onboardingHelpEnabled?: boolean;
};

type TabKey = "paiement" | "fournitures";

type WalletTransactionRow = {
  id: string;
  type: "TOPUP" | "ALLOCATION";
  amount: number;
  createdAt: string;
  note: string | null;
};

type ChildFinanceStatus = {
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

type WalletSummary = {
  walletId: string;
  balance: number;
  transactions: WalletTransactionRow[];
  children: ChildFinanceStatus[];
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

type SupplyItemRow = {
  id: string;
  rank: number;
  label: string;
  quantity: number;
  note: string | null;
};

type ChildSupplyList = {
  targetSchoolYearId: string | null;
  targetSchoolYearLabel?: string;
  items: SupplyItemRow[];
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

export default function ReinscriptionPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("paiement");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reinscribingStudentId, setReinscribingStudentId] = useState<
    string | null
  >(null);
  const [supplyLists, setSupplyLists] = useState<
    Record<string, ChildSupplyList>
  >({});
  const [supplyListsLoading, setSupplyListsLoading] = useState(false);

  const loadWallet = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/me/finance/wallet`,
        { credentials: "include" },
      );
      if (!response.ok) {
        setError(t("reinscriptionWeb.errors.load"));
        return;
      }
      setWallet((await response.json()) as WalletSummary);
    } catch {
      setError(t("reinscriptionWeb.errors.network"));
    }
  }, [schoolSlug, t]);

  useEffect(() => {
    void loadProfile();
  }, [schoolSlug]);

  useEffect(() => {
    if (me) void loadWallet();
  }, [me, loadWallet]);

  const eligibleChildren = (wallet?.children ?? []).filter(
    (child) => child.status !== "DECISION_PENDING",
  );

  const loadSupplyLists = useCallback(async () => {
    if (eligibleChildren.length === 0) return;
    setSupplyListsLoading(true);
    try {
      const entries = await Promise.all(
        eligibleChildren.map(async (child) => {
          const response = await fetch(
            `${API_URL}/schools/${schoolSlug}/me/supply-lists/students/${child.student.id}`,
            { credentials: "include" },
          );
          const payload = response.ok
            ? ((await response.json()) as ChildSupplyList)
            : { targetSchoolYearId: null, items: [] };
          return [child.student.id, payload] as const;
        }),
      );
      setSupplyLists(Object.fromEntries(entries));
    } finally {
      setSupplyListsLoading(false);
    }
  }, [schoolSlug, JSON.stringify(eligibleChildren.map((c) => c.student.id))]);

  useEffect(() => {
    if (tab === "fournitures") void loadSupplyLists();
  }, [tab, loadSupplyLists]);

  async function loadProfile() {
    setLoading(true);
    const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
      credentials: "include",
    });
    if (!response.ok) {
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }
    const payload = (await response.json()) as MeResponse;
    if (payload.role !== "PARENT") {
      router.replace(`/schools/${schoolSlug}/dashboard`);
      return;
    }
    setMe(payload);
    setLoading(false);

    const tourStore = useOnboardingTourStore.getState();
    if (
      payload.onboardingHelpEnabled !== false &&
      !tourStore.isCompleted("parent", REINSCRIPTION_PARENT_TOUR_ID) &&
      !tourStore.activeTourId
    ) {
      tourStore.startTour(
        REINSCRIPTION_PARENT_TOUR_ID,
        "parent",
        REINSCRIPTION_PARENT_TOUR_STEPS,
      );
    }
  }

  async function onPayAndReinscribe(child: ChildFinanceStatus) {
    if (!child.targetSchoolYearId) return;
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("common.errors.invalidCsrfSession"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }
    setReinscribingStudentId(child.student.id);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/me/finance/wallet/pay-and-reinscribe`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            studentId: child.student.id,
            schoolYearId: child.targetSchoolYearId,
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ??
              t("reinscriptionWeb.wallet.errors.reinscribe"));
        setError(String(message));
        return;
      }
      setSuccess(
        t("reinscriptionWeb.wallet.success.reinscribed").replace(
          "{firstName}",
          child.student.firstName,
        ),
      );
      await loadWallet();
    } catch {
      setError(t("reinscriptionWeb.errors.network"));
    } finally {
      setReinscribingStudentId(null);
    }
  }

  usePageHelp({
    title: t("reinscriptionWeb.help.title"),
    sections: [
      {
        title: t("reinscriptionWeb.help.section1Title"),
        body: [t("reinscriptionWeb.help.section1Body")],
      },
      {
        title: t("reinscriptionWeb.help.section2Title"),
        body: [t("reinscriptionWeb.help.section2Body")],
      },
      {
        title: t("reinscriptionWeb.help.section3Title"),
        body: [t("reinscriptionWeb.help.section3Body")],
      },
    ],
  });

  return (
    <div className="grid gap-4">
      <Card
        title={t("reinscriptionWeb.title")}
        subtitle={
          me
            ? t("reinscriptionWeb.subtitle").replace(
                "{fullName}",
                `${me.firstName} ${me.lastName}`,
              )
            : t("common.loading")
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">{t("common.loading")}</p>
        ) : (
          <div className="grid gap-4">
            <OnboardingTarget
              id={REINSCRIPTION_PARENT_TOUR_TARGETS.suppliesTab}
            >
              <div className="-mx-1 flex items-end gap-1 overflow-x-auto border-b border-border px-1 pb-1">
                <button
                  type="button"
                  onClick={() => setTab("paiement")}
                  data-testid="reinscription-tab-paiement"
                  className={`shrink-0 rounded-t-card px-3 py-2 text-sm font-heading font-semibold ${
                    tab === "paiement"
                      ? "border border-border border-b-surface bg-surface text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {t("reinscriptionWeb.tabs.paiement")}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("fournitures")}
                  data-testid="reinscription-tab-fournitures"
                  className={`shrink-0 rounded-t-card px-3 py-2 text-sm font-heading font-semibold ${
                    tab === "fournitures"
                      ? "border border-border border-b-surface bg-surface text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {t("reinscriptionWeb.tabs.fournitures")}
                </button>
              </div>
            </OnboardingTarget>

            {error ? (
              <div className="rounded-card border border-notification bg-notification/5 p-3 text-sm text-notification">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-card border border-primary bg-primary/5 p-3 text-sm text-primary">
                {success}
              </div>
            ) : null}

            {tab === "paiement" ? (
              <div className="grid gap-4">
                <OnboardingTarget id={REINSCRIPTION_PARENT_TOUR_TARGETS.wallet}>
                  <article
                    className="flex items-center gap-3 rounded-card border border-border bg-background p-4"
                    data-testid="wallet-summary-card"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Wallet className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-secondary">
                        {t("reinscriptionWeb.wallet.balance")}
                      </p>
                      <p className="text-lg font-heading font-bold text-primary">
                        {wallet ? formatXaf(wallet.balance) : "-"}
                      </p>
                    </div>
                    <Link
                      href={`/schools/${schoolSlug}/situation-financiere`}
                      className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
                      data-testid="wallet-summary-topup-link"
                    >
                      {t("reinscriptionWeb.wallet.topUpLink")}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                </OnboardingTarget>

                <OnboardingTarget
                  id={REINSCRIPTION_PARENT_TOUR_TARGETS.children}
                >
                  <Card
                    title={t("reinscriptionWeb.children.title")}
                    className="bg-background"
                  >
                    <div className="grid gap-3">
                      {eligibleChildren.map((child) => {
                        const required = child.requiredAmount ?? 0;
                        const isReady = child.status === "READY_TO_REINSCRIBE";
                        const isConfirmed =
                          child.status === "ALREADY_REINSCRIBED";
                        const insufficientBalance =
                          isReady && (!wallet || wallet.balance < required);
                        const daysLeft = child.reinscriptionDeadline
                          ? daysUntil(child.reinscriptionDeadline)
                          : null;

                        const hasPromotion = Boolean(
                          child.nextAcademicLevelLabel &&
                          (child.previousLevelLabel ||
                            child.previousClassLabel),
                        );

                        return (
                          <article
                            key={child.student.id}
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
                                {initials(
                                  child.student.firstName,
                                  child.student.lastName,
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-heading font-semibold text-text-primary">
                                  {child.student.firstName}{" "}
                                  {child.student.lastName}
                                </p>
                                {hasPromotion ? (
                                  <p className="truncate text-xs text-text-secondary">
                                    {child.previousLevelLabel ??
                                      child.previousClassLabel ??
                                      "—"}
                                    {"  →  "}
                                    {child.nextAcademicLevelLabel}
                                  </p>
                                ) : null}
                              </div>
                              {isConfirmed ? (
                                <span className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {t(
                                    "reinscriptionWeb.children.status.ALREADY_REINSCRIBED",
                                  )}
                                </span>
                              ) : null}
                            </div>

                            {child.student.dateOfBirth ? (
                              <p className="mt-2 text-xs text-text-secondary">
                                {t(
                                  "reinscriptionWeb.children.dateOfBirth",
                                ).replace(
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
                                {t(
                                  `reinscriptionWeb.children.status.${child.status}`,
                                )}
                              </div>
                            ) : null}

                            {isReady ? (
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
                                      daysLeft <= 3
                                        ? "text-red-700"
                                        : "text-text-secondary"
                                    }`}
                                  >
                                    {daysLeft >= 0
                                      ? t(
                                          "reinscriptionWeb.children.daysLeft",
                                        ).replace("{count}", String(daysLeft))
                                      : t(
                                          "reinscriptionWeb.children.deadlinePassed",
                                        )}
                                    {" — "}
                                    {formatDate(child.reinscriptionDeadline!)}
                                  </p>
                                ) : null}

                                {child.targetSchoolYearStartsAt ? (
                                  <p className="text-xs text-text-secondary">
                                    {t(
                                      "reinscriptionWeb.children.schoolYearStart",
                                    ).replace(
                                      "{date}",
                                      formatDate(
                                        child.targetSchoolYearStartsAt,
                                      ),
                                    )}
                                  </p>
                                ) : null}

                                {insufficientBalance ? (
                                  <p
                                    className="mt-1 rounded-card bg-red-50 p-2 text-xs font-semibold text-red-700"
                                    data-testid={`insufficient-balance-${child.student.id}`}
                                  >
                                    {t(
                                      "reinscriptionWeb.children.insufficientBalance",
                                    ).replace(
                                      "{amount}",
                                      formatXaf(
                                        required - (wallet?.balance ?? 0),
                                      ),
                                    )}
                                  </p>
                                ) : null}

                                <OnboardingTarget
                                  id={
                                    REINSCRIPTION_PARENT_TOUR_TARGETS.reinscribe
                                  }
                                >
                                  <Button
                                    type="button"
                                    onClick={() => onPayAndReinscribe(child)}
                                    disabled={
                                      reinscribingStudentId ===
                                        child.student.id || insufficientBalance
                                    }
                                    data-testid={`pay-and-reinscribe-${child.student.id}`}
                                    className="mt-1 w-full"
                                  >
                                    {t(
                                      "reinscriptionWeb.children.payAndReinscribe",
                                    )}
                                  </Button>
                                </OnboardingTarget>
                              </div>
                            ) : null}

                            {isConfirmed ? (
                              <div className="mt-2 grid gap-1">
                                <p className="text-sm font-heading font-semibold text-emerald-800">
                                  {t(
                                    "reinscriptionWeb.children.confirmed.title",
                                  )}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {t(
                                    "reinscriptionWeb.children.confirmed.message",
                                  )}
                                </p>
                                {child.targetSchoolYearStartsAt ? (
                                  <p className="text-xs text-text-secondary">
                                    {t(
                                      "reinscriptionWeb.children.schoolYearStart",
                                    ).replace(
                                      "{date}",
                                      formatDate(
                                        child.targetSchoolYearStartsAt,
                                      ),
                                    )}
                                  </p>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => setTab("fournitures")}
                                  data-testid={`view-supplies-${child.student.id}`}
                                  className="justify-self-start text-xs font-semibold text-primary"
                                >
                                  {t(
                                    "reinscriptionWeb.children.confirmed.viewSupplies",
                                  )}
                                </button>
                              </div>
                            ) : null}

                            {child.targetSchoolYearId ? (
                              <InstallmentBreakdown
                                schoolSlug={schoolSlug}
                                studentId={child.student.id}
                                schoolYearId={child.targetSchoolYearId}
                              />
                            ) : null}
                          </article>
                        );
                      })}
                      {eligibleChildren.length === 0 ? (
                        <p className="text-sm text-text-secondary">
                          {t("reinscriptionWeb.children.empty")}
                        </p>
                      ) : null}
                    </div>
                  </Card>
                </OnboardingTarget>
              </div>
            ) : null}

            {tab === "fournitures" ? (
              <div
                className="grid gap-3"
                data-testid="reinscription-supplies-list"
              >
                {supplyListsLoading ? (
                  <p className="text-sm text-text-secondary">
                    {t("common.loading")}
                  </p>
                ) : eligibleChildren.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    {t("reinscriptionWeb.supplies.emptyList")}
                  </p>
                ) : (
                  eligibleChildren.map((child) => {
                    const supplyList = supplyLists[child.student.id];
                    return (
                      <Card
                        key={child.student.id}
                        title={`${child.student.firstName} ${child.student.lastName}`}
                        subtitle={supplyList?.targetSchoolYearLabel}
                        className="bg-background"
                      >
                        {!supplyList || !supplyList.targetSchoolYearId ? (
                          <p className="text-sm text-text-secondary">
                            {t("reinscriptionWeb.supplies.notOpenYet")}
                          </p>
                        ) : supplyList.items.length === 0 ? (
                          <p className="text-sm text-text-secondary">
                            {t("reinscriptionWeb.supplies.empty")}
                          </p>
                        ) : (
                          <ul className="grid gap-1 text-sm text-text-secondary">
                            {supplyList.items
                              .slice()
                              .sort((a, b) => a.rank - b.rank)
                              .map((item) => (
                                <li key={item.id}>
                                  {item.rank}. {item.label} — x{item.quantity}
                                  {item.note ? ` (${item.note})` : ""}
                                </li>
                              ))}
                          </ul>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
