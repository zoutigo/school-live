"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { Card } from "../../../../../components/ui/card";
import { OnboardingTarget } from "../../../../../components/onboarding/onboarding-target";
import {
  ChildReenrollmentCard,
  type ChildFinanceStatus,
} from "../../../../../components/finance/child-reenrollment-card";
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

type WalletTransactionRow = {
  id: string;
  type: "TOPUP" | "ALLOCATION";
  amount: number;
  createdAt: string;
  note: string | null;
};

type WalletSummary = {
  walletId: string;
  balance: number;
  transactions: WalletTransactionRow[];
  children: ChildFinanceStatus[];
};

function formatXaf(amount: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ReinscriptionPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reinscribingStudentId, setReinscribingStudentId] = useState<
    string | null
  >(null);

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

            {
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
                      {eligibleChildren.map((child) => (
                        <ChildReenrollmentCard
                          key={child.student.id}
                          schoolSlug={schoolSlug}
                          child={child}
                          walletBalance={wallet?.balance ?? 0}
                          submitting={
                            reinscribingStudentId === child.student.id
                          }
                          onPayAndReinscribe={onPayAndReinscribe}
                          showInstallmentBreakdown
                          reinscribeTourTargetId={
                            REINSCRIPTION_PARENT_TOUR_TARGETS.reinscribe
                          }
                        />
                      ))}
                      {eligibleChildren.length === 0 ? (
                        <p className="text-sm text-text-secondary">
                          {t("reinscriptionWeb.children.empty")}
                        </p>
                      ) : null}
                    </div>
                  </Card>
                </OnboardingTarget>
              </div>
            }
          </div>
        )}
      </Card>
    </div>
  );
}
