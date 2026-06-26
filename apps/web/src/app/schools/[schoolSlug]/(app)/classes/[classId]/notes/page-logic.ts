"use client";

type TeacherContext = {
  class: {
    id: string;
    name: string;
    schoolYearId: string;
  };
  subjects: Array<{
    id: string;
    name: string;
    branches: Array<{ id: string; name: string; code?: string | null }>;
  }>;
  evaluationTypes: Array<{
    id: string;
    code: string;
    label: string;
    isDefault: boolean;
  }>;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
};

type EvaluationRow = {
  scheduledAt?: string | null;
  createdAt: string;
  _count: { scores: number };
};

export type Sequence =
  | "SEQ_1"
  | "SEQ_2"
  | "SEQ_3"
  | "SEQ_4"
  | "SEQ_5"
  | "SEQ_6";

export type CreateEvaluationFormValues = {
  subjectId: string;
  subjectBranchId: string;
  evaluationTypeId: string;
  title: string;
  description: string;
  coefficient: number;
  maxScore: number;
  sequence: Sequence;
  isFinalExam: boolean;
  scheduledAt: string;
  status: "DRAFT" | "PUBLISHED";
};

export function getCreateEvaluationDefaults(
  context?: TeacherContext | null,
  overrides: Partial<CreateEvaluationFormValues> = {},
): CreateEvaluationFormValues {
  const firstSubject = context?.subjects[0];
  const subjectId = overrides.subjectId ?? firstSubject?.id ?? "";
  const selectedSubject =
    context?.subjects.find((entry) => entry.id === subjectId) ?? firstSubject;

  return {
    subjectId,
    subjectBranchId:
      overrides.subjectBranchId ?? selectedSubject?.branches[0]?.id ?? "",
    evaluationTypeId:
      overrides.evaluationTypeId ?? context?.evaluationTypes[0]?.id ?? "",
    title: overrides.title ?? "",
    description: overrides.description ?? "",
    coefficient: overrides.coefficient ?? 1,
    maxScore: overrides.maxScore ?? 20,
    sequence: overrides.sequence ?? "SEQ_1",
    isFinalExam: overrides.isFinalExam ?? false,
    scheduledAt: overrides.scheduledAt ?? "",
    status: overrides.status ?? "DRAFT",
  };
}

export function paginateEvaluations<T>(
  items: T[],
  page: number,
  pageSize: number,
): T[] {
  const safePageSize = Math.max(1, pageSize);
  const safePage = Math.max(1, page);
  const startIndex = (safePage - 1) * safePageSize;
  return items.slice(startIndex, startIndex + safePageSize);
}

export function getEvaluationListMeta(
  evaluation: Pick<EvaluationRow, "scheduledAt" | "createdAt" | "_count">,
  studentCount: number,
) {
  return {
    scoreProgress: `${evaluation._count.scores}/${studentCount}`,
    dateLabel: new Date(
      evaluation.scheduledAt ?? evaluation.createdAt,
    ).toLocaleDateString("fr-FR"),
  };
}

export function hasMeaningfulRichTextContent(input: string | null | undefined) {
  if (!input) {
    return false;
  }

  return (
    input
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim().length > 0
  );
}

export function normalizeOptionalRichTextHtml(
  input: string | null | undefined,
) {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim();
  return hasMeaningfulRichTextContent(trimmed) ? trimmed : undefined;
}
