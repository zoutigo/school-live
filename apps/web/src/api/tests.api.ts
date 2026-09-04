import { getCsrfTokenCookie } from "../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function csrfHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const token = getCsrfTokenCookie();
  return token ? { ...headers, "x-csrf-token": token } : headers;
}

async function throwIfError(response: Response, fallback: string) {
  if (response.ok) return;
  const payload = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = Array.isArray(payload?.message)
    ? payload.message.join(", ")
    : typeof payload?.message === "string"
      ? payload.message
      : fallback;
  throw new Error(message);
}

export type TestCampaignStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type TestCasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TestExecutionStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "PASSED"
  | "FAILED"
  | "BLOCKED"
  | "SKIPPED";

export type TestCampaignSummary = {
  id: string;
  title: string;
  description: string | null;
  targetVersion: string | null;
  startsAt: string | null;
  dueAt: string | null;
  status: TestCampaignStatus;
  assignedToMe: boolean;
  summary: {
    totalCases: number;
    completedCases: number;
    totalExecutions: number;
  };
};

export type TestCampaignDetail = {
  id: string;
  title: string;
  description: string | null;
  targetVersion: string | null;
  startsAt: string | null;
  dueAt: string | null;
  status: TestCampaignStatus;
  summary: { totalCases: number; completedCases: number };
  testCases: Array<{
    id: string;
    title: string;
    module: string | null;
    expectedResult: string;
    priority: TestCasePriority;
    dueAt: string | null;
    evidenceRequired: boolean;
    totalExecutions: number;
    latestExecution: {
      id: string;
      status: TestExecutionStatus;
      executedAt: string;
    } | null;
  }>;
};

export type TestExecutionAttachment = {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export type TestExecutionItem = {
  id: string;
  status: TestExecutionStatus;
  resultText: string | null;
  comment: string | null;
  deviceInfo: string | null;
  appVersion: string | null;
  executedAt: string;
  createdAt: string;
  reworkRequestedAt: string | null;
  reworkNote: string | null;
  user: { id: string; fullName: string };
  reworkRequestedBy: { id: string; fullName: string } | null;
  attachments: TestExecutionAttachment[];
};

export type TestExecutionRow = {
  id: string;
  status: TestExecutionStatus;
  resultText: string | null;
  comment: string | null;
  executedAt: string;
  adminReviewedAt: string | null;
  adminReviewNote: string | null;
  reworkRequestedAt: string | null;
  reworkNote: string | null;
  user: { id: string; fullName: string };
  adminReviewedBy: { id: string; fullName: string } | null;
  reworkRequestedBy: { id: string; fullName: string } | null;
  testCase: { id: string; title: string };
  campaign: { id: string; title: string };
};

export type TestCaseToRedo = {
  id: string;
  title: string;
  module: string | null;
  priority: TestCasePriority;
  evidenceRequired: boolean;
  campaign: { id: string; title: string };
  reworkRequestedAt: string;
  reworkNote: string | null;
  reworkRequestedByName: string | null;
  lastExecutedAt: string;
};

export type TestExecutionDetail = TestExecutionRow & {
  deviceInfo: string | null;
  appVersion: string | null;
  createdAt: string;
  attachments: TestExecutionAttachment[];
};

export type TestCaseDetail = {
  id: string;
  title: string;
  module: string | null;
  objective: string | null;
  preconditions: string | null;
  steps: string[];
  expectedResult: string;
  orderIndex: number;
  priority: TestCasePriority;
  evidenceRequired: boolean;
  dueAt: string | null;
  campaign: {
    id: string;
    title: string;
    dueAt: string | null;
    targetVersion: string | null;
  };
  audienceRoles: string[];
  latestOwnExecution: TestExecutionItem | null;
  executionSummary: {
    totalExecutions: number;
    passed: number;
    failed: number;
    blocked: number;
  };
  completedByUsers: Array<{
    userId: string;
    fullName: string;
    status: TestExecutionStatus;
    executedAt: string;
  }>;
  executions: TestExecutionItem[];
};

export type ListExecutionsParams = {
  status?: TestExecutionStatus | "";
  campaignId?: string;
  page?: number;
  limit?: number;
};

export const testsApi = {
  async listCampaigns(): Promise<TestCampaignSummary[]> {
    const response = await fetch(`${API_URL}/tests/campaigns`, {
      credentials: "include",
    });
    await throwIfError(response, "TESTS_LIST_CAMPAIGNS_FAILED");
    return (await response.json()) as TestCampaignSummary[];
  },

  async listToRedo(): Promise<TestCaseToRedo[]> {
    const response = await fetch(`${API_URL}/tests/to-redo`, {
      credentials: "include",
    });
    await throwIfError(response, "TESTS_LIST_TO_REDO_FAILED");
    return (await response.json()) as TestCaseToRedo[];
  },

  async getCampaign(campaignId: string): Promise<TestCampaignDetail> {
    const response = await fetch(`${API_URL}/tests/campaigns/${campaignId}`, {
      credentials: "include",
    });
    await throwIfError(response, "TESTS_GET_CAMPAIGN_FAILED");
    return (await response.json()) as TestCampaignDetail;
  },

  async getTestCase(testCaseId: string): Promise<TestCaseDetail> {
    const response = await fetch(`${API_URL}/tests/cases/${testCaseId}`, {
      credentials: "include",
    });
    await throwIfError(response, "TESTS_GET_CASE_FAILED");
    return (await response.json()) as TestCaseDetail;
  },

  async createExecution(
    testCaseId: string,
    payload: {
      status: TestExecutionStatus;
      resultText: string;
      comment?: string;
      deviceInfo?: string;
      appVersion?: string;
      attachments?: File[];
    },
  ): Promise<TestExecutionItem> {
    const formData = new FormData();
    formData.append("status", payload.status);
    formData.append("resultText", payload.resultText);
    if (payload.comment !== undefined) {
      formData.append("comment", payload.comment);
    }
    if (payload.deviceInfo !== undefined) {
      formData.append("deviceInfo", payload.deviceInfo);
    }
    if (payload.appVersion !== undefined) {
      formData.append("appVersion", payload.appVersion);
    }
    for (const file of payload.attachments ?? []) {
      formData.append("attachments", file);
    }

    const response = await fetch(
      `${API_URL}/tests/cases/${testCaseId}/executions`,
      {
        method: "POST",
        credentials: "include",
        headers: csrfHeaders(),
        body: formData,
      },
    );
    await throwIfError(response, "TESTS_CREATE_EXECUTION_FAILED");
    return (await response.json()) as TestExecutionItem;
  },

  async listExecutions(
    params: ListExecutionsParams = {},
  ): Promise<{ items: TestExecutionRow[] }> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.campaignId) query.set("campaignId", params.campaignId);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    const response = await fetch(
      `${API_URL}/tests/executions?${query.toString()}`,
      { credentials: "include" },
    );
    await throwIfError(response, "TESTS_LIST_EXECUTIONS_FAILED");
    return (await response.json()) as { items: TestExecutionRow[] };
  },

  async getExecution(executionId: string): Promise<TestExecutionDetail> {
    const response = await fetch(`${API_URL}/tests/executions/${executionId}`, {
      credentials: "include",
    });
    await throwIfError(response, "TESTS_GET_EXECUTION_FAILED");
    return (await response.json()) as TestExecutionDetail;
  },

  async updateExecution(
    executionId: string,
    payload: { status: TestExecutionStatus; resultText: string; comment?: string },
  ): Promise<TestExecutionDetail> {
    const response = await fetch(`${API_URL}/tests/executions/${executionId}`, {
      method: "PATCH",
      credentials: "include",
      headers: csrfHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        status: payload.status,
        resultText: payload.resultText,
        comment: payload.comment ?? "",
      }),
    });
    await throwIfError(response, "TESTS_UPDATE_EXECUTION_FAILED");
    return (await response.json()) as TestExecutionDetail;
  },
};

export type CampaignDisplayStatus = "UPCOMING" | "IN_PROGRESS" | "COMPLETED";

export function getCampaignDisplayStatus(campaign: {
  startsAt: string | null;
  summary: { totalCases: number; completedCases: number };
}): CampaignDisplayStatus {
  const { totalCases, completedCases } = campaign.summary;
  if (totalCases > 0 && completedCases >= totalCases) {
    return "COMPLETED";
  }
  const startsAt = campaign.startsAt ? new Date(campaign.startsAt) : null;
  if (startsAt && startsAt.getTime() > Date.now() && completedCases === 0) {
    return "UPCOMING";
  }
  return "IN_PROGRESS";
}

export function sortCampaignsByDisplayStatus<
  T extends {
    startsAt: string | null;
    dueAt: string | null;
    assignedToMe: boolean;
    summary: { totalCases: number; completedCases: number };
  },
>(campaigns: T[], options: { prioritizeMine?: boolean } = {}): T[] {
  const order: Record<CampaignDisplayStatus, number> = {
    IN_PROGRESS: 0,
    UPCOMING: 1,
    COMPLETED: 2,
  };
  const prioritizeMine = options.prioritizeMine ?? true;

  return [...campaigns].sort((a, b) => {
    const statusDiff =
      order[getCampaignDisplayStatus(a)] - order[getCampaignDisplayStatus(b)];
    if (statusDiff !== 0) return statusDiff;

    if (prioritizeMine) {
      const mineDiff = Number(!a.assignedToMe) - Number(!b.assignedToMe);
      if (mineDiff !== 0) return mineDiff;
    }

    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
    return aDue - bDue;
  });
}
