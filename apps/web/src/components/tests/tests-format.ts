import type {
  TestCasePriority,
  TestExecutionStatus,
} from "../../api/tests.api";
import type { CampaignDisplayStatus } from "../../api/tests.api";
import type { TranslateFn } from "../../i18n/useTranslation";

export type CampaignsFilter = "ALL" | CampaignDisplayStatus;
export const ALL_CAMPAIGNS_FILTER: CampaignsFilter = "ALL";

export function statusLabel(t: TranslateFn, value: TestExecutionStatus | null) {
  switch (value) {
    case "PASSED":
      return t("tests.status.passed");
    case "FAILED":
      return t("tests.status.failed");
    case "BLOCKED":
      return t("tests.status.blocked");
    case "SKIPPED":
      return t("tests.status.skipped");
    case "IN_PROGRESS":
      return t("tests.status.inProgress");
    case "TODO":
      return t("tests.status.todo");
    default:
      return t("tests.status.notStarted");
  }
}

export function priorityLabel(t: TranslateFn, value: TestCasePriority) {
  switch (value) {
    case "LOW":
      return t("tests.priority.low");
    case "HIGH":
      return t("tests.priority.high");
    case "CRITICAL":
      return t("tests.priority.critical");
    default:
      return t("tests.priority.medium");
  }
}

export function campaignStatusKey(status: CampaignDisplayStatus) {
  switch (status) {
    case "IN_PROGRESS":
      return "inProgress";
    case "UPCOMING":
      return "upcoming";
    default:
      return "completed";
  }
}

export function statusTone(
  status: TestExecutionStatus | null,
): "neutral" | "success" | "danger" | "warning" {
  switch (status) {
    case "PASSED":
    case "IN_PROGRESS":
      return "success";
    case "FAILED":
      return "danger";
    case "BLOCKED":
      return "warning";
    default:
      return "neutral";
  }
}

export const STATUS_TONE_CLASSES: Record<
  "neutral" | "success" | "danger" | "warning",
  string
> = {
  success: "border border-[#bfe3cc] bg-[#e4f5ea] text-[#20744a]",
  danger: "border border-[#f3b3b8] bg-[#fce8e6] text-[#b42318]",
  warning: "border border-[#f0dca8] bg-[#fff3dd] text-[#9a6700]",
  neutral: "border border-warm-border bg-warm-surface text-text-secondary",
};

export function formatDate(value: string, locale: "fr" | "en") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string, locale: "fr" | "en") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
