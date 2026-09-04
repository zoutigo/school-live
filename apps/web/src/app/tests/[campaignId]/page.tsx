"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "../../../components/layout/app-shell";
import { BackLinkButton } from "../../../components/ui/back-link-button";
import { useTranslation } from "../../../i18n/useTranslation";
import {
  testsApi,
  getCampaignDisplayStatus,
  type TestCampaignDetail,
} from "../../../api/tests.api";
import {
  campaignStatusKey,
  priorityLabel,
  statusLabel,
} from "../../../components/tests/tests-format";

export default function TestCampaignDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;
  const [campaign, setCampaign] = useState<TestCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await testsApi.getCampaign(campaignId);
      setCampaign(response);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t("tests.common.errors.loadGeneric"),
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <BackLinkButton href="/tests">{t("common.back")}</BackLinkButton>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-text-secondary">
            {t("common.loading")}
          </div>
        ) : errorMessage || !campaign ? (
          <p className="text-sm text-notification" data-testid="tests-campaign-error">
            {errorMessage ?? t("tests.common.errors.loadGeneric")}
          </p>
        ) : (
          <>
            <CampaignHero campaign={campaign} />

            <div className="grid gap-3" data-testid="tests-campaign-cases">
              {campaign.testCases.map((testCase) => {
                const hasOwnResult = !!testCase.latestExecution;
                return (
                  <Link
                    key={testCase.id}
                    href={`/tests/cases/${testCase.id}`}
                    data-testid={`test-case-card-${testCase.id}`}
                    className="rounded-[16px] border border-warm-border bg-surface p-4 hover:shadow-card"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-heading text-base font-semibold text-text-primary">
                        {testCase.title}
                      </p>
                      <span className="rounded-full border border-warm-border bg-warm-surface px-2 py-1 text-xs font-semibold text-text-secondary">
                        {statusLabel(
                          t,
                          testCase.latestExecution?.status ?? null,
                        )}
                      </span>
                    </div>
                    {testCase.module ? (
                      <p className="mt-1 text-sm text-text-secondary">
                        {testCase.module}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
                      <span>
                        {priorityLabel(t, testCase.priority)} ·{" "}
                        {t("tests.cases.executionCount").replace(
                          "{count}",
                          String(testCase.totalExecutions),
                        )}
                      </span>
                      <span className="font-semibold text-primary">
                        {t(
                          hasOwnResult
                            ? "tests.campaigns.actions.review"
                            : "tests.campaigns.actions.start",
                        )}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function CampaignHero({ campaign }: { campaign: TestCampaignDetail }) {
  const { t } = useTranslation();
  const status = getCampaignDisplayStatus(campaign);
  const total = campaign.summary.totalCases;
  const done = campaign.summary.completedCases;
  const ratio = total > 0 ? Math.min(1, done / total) : 0;

  return (
    <div
      className="rounded-[20px] bg-primary p-6 text-surface"
      data-testid="campaign-hero"
    >
      <span className="inline-block rounded-full bg-surface/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
        {t(`tests.campaigns.status.${campaignStatusKey(status)}`)}
      </span>
      <h1 className="mt-3 text-xl font-bold">{campaign.title}</h1>
      {campaign.description ? (
        <p className="mt-2 text-sm text-surface/90">{campaign.description}</p>
      ) : null}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface/25">
        <div
          className="h-2 rounded-full bg-surface"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm font-semibold">
        <span>
          {t("tests.campaigns.progressLabel")
            .replace("{done}", String(done))
            .replace("{total}", String(total))}
        </span>
        {campaign.targetVersion ? (
          <span>
            {t("tests.campaigns.targetVersion").replace(
              "{version}",
              campaign.targetVersion,
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}
