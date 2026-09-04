"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../../../components/layout/app-shell";
import { BackLinkButton } from "../../../../components/ui/back-link-button";
import {
  FormSelect,
  FormTextarea,
} from "../../../../components/ui/form-controls";
import { SuccessRedirectToast } from "../../../../components/ui/success-redirect-toast";
import { useTranslation } from "../../../../i18n/useTranslation";
import {
  testsApi,
  type TestExecutionDetail,
  type TestExecutionStatus,
} from "../../../../api/tests.api";
import {
  formatDateTime,
  statusLabel,
} from "../../../../components/tests/tests-format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const SUBMIT_STATUSES: TestExecutionStatus[] = [
  "PASSED",
  "FAILED",
  "BLOCKED",
  "SKIPPED",
  "IN_PROGRESS",
];

type FormValues = {
  status: TestExecutionStatus;
  resultText: string;
  comment: string;
};

function buildSchema(t: (key: string) => string) {
  return z.object({
    status: z.enum([
      "PASSED",
      "FAILED",
      "BLOCKED",
      "SKIPPED",
      "IN_PROGRESS",
      "TODO",
    ]),
    resultText: z
      .string()
      .trim()
      .min(1, t("tests.executions.edit.validation.resultRequired")),
    comment: z.string(),
  });
}

export default function TestExecutionDetailPage() {
  const { t, locale } = useTranslation();
  const params = useParams<{ executionId: string }>();
  const executionId = params.executionId;
  const [detail, setDetail] = useState<TestExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await testsApi.getExecution(executionId);
      setDetail(response);
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
  }, [executionId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const meRes = await fetch(`${API_URL}/me`, { credentials: "include" });
        if (!meRes.ok) return;
        const me = (await meRes.json()) as {
          isTester?: boolean;
          platformRoles?: string[];
        };
        setCanEdit(
          Boolean(me.isTester) ||
            (me.platformRoles ?? []).some((role) =>
              ["ADMIN", "SUPER_ADMIN"].includes(role),
            ),
        );
      } catch {
        // Keep the page read-only if /me is unreachable.
      }
    })();
  }, []);

  const schema = buildSchema(t);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { status: "PASSED", resultText: "", comment: "" },
  });

  function openEdit() {
    if (!detail) return;
    reset({
      status: detail.status,
      resultText: detail.resultText ?? "",
      comment: detail.comment ?? "",
    });
    setSubmitError(null);
    setEditing(true);
  }

  const onValid = handleSubmit(async (values) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await testsApi.updateExecution(executionId, {
        status: values.status,
        resultText: values.resultText.trim(),
        comment: values.comment.trim() || undefined,
      });
      setEditing(false);
      setShowSuccess(true);
      void load();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t("tests.common.errors.submitGeneric"),
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <BackLinkButton href="/tests">{t("common.back")}</BackLinkButton>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-text-secondary">
            {t("common.loading")}
          </div>
        ) : errorMessage || !detail ? (
          <p
            className="text-sm text-notification"
            data-testid="test-execution-error"
          >
            {errorMessage ?? t("tests.common.errors.loadGeneric")}
          </p>
        ) : editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onValid();
            }}
            className="space-y-4 rounded-[20px] border border-warm-border bg-surface p-5"
            data-testid="edit-execution-form"
          >
            <p className="font-heading text-base font-semibold text-text-primary">
              {t("tests.executions.edit.heroTitle")}
            </p>

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <FormSelect {...field} data-testid="edit-execution-status">
                  {SUBMIT_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(t, value)}
                    </option>
                  ))}
                </FormSelect>
              )}
            />

            <div>
              <Controller
                control={control}
                name="resultText"
                render={({ field }) => (
                  <FormTextarea
                    {...field}
                    invalid={!!errors.resultText}
                    rows={4}
                    data-testid="edit-execution-result-input"
                  />
                )}
              />
              {errors.resultText ? (
                <p
                  className="mt-1 text-xs font-semibold text-notification"
                  data-testid="edit-execution-result-error"
                >
                  {errors.resultText.message}
                </p>
              ) : null}
            </div>

            <Controller
              control={control}
              name="comment"
              render={({ field }) => (
                <FormTextarea
                  {...field}
                  rows={3}
                  data-testid="edit-execution-comment-input"
                />
              )}
            />

            {submitError ? (
              <p className="text-sm text-notification">{submitError}</p>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
                data-testid="edit-execution-cancel-btn"
                className="flex-1 rounded-card border border-warm-border bg-warm-surface py-3 text-sm font-semibold text-text-primary"
              >
                {t("tests.executions.edit.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="edit-execution-submit-btn"
                className="flex-[2] rounded-card bg-primary py-3 text-sm font-semibold text-surface hover:bg-primary-dark disabled:opacity-60"
              >
                {isSubmitting
                  ? t("tests.executions.edit.submitting")
                  : t("tests.executions.edit.submit")}
              </button>
            </div>
          </form>
        ) : (
          <div
            className="space-y-4 rounded-[20px] border border-warm-border bg-surface p-5"
            data-testid="test-execution-detail"
          >
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-heading text-lg font-bold text-text-primary">
                {detail.testCase.title}
              </h1>
              <span className="rounded-full border border-warm-border bg-warm-surface px-2 py-1 text-xs font-semibold text-text-secondary">
                {statusLabel(t, detail.status)}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {t("tests.executions.cardCampaign").replace(
                "{title}",
                detail.campaign.title,
              )}{" "}
              · {formatDateTime(detail.executedAt, locale)}
            </p>

            <div>
              <p className="font-heading text-sm font-semibold text-text-primary">
                {t("tests.executions.detail.resultLabel")}
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {detail.resultText?.trim() || t("tests.common.noValue")}
              </p>
            </div>

            {detail.comment ? (
              <div>
                <p className="font-heading text-sm font-semibold text-text-primary">
                  {t("tests.executions.detail.commentLabel")}
                </p>
                <p className="mt-1 text-sm text-text-primary">
                  {detail.comment}
                </p>
              </div>
            ) : null}

            {detail.deviceInfo || detail.appVersion ? (
              <div className="flex flex-wrap gap-2 text-xs text-primary">
                {detail.deviceInfo ? (
                  <span className="rounded-full bg-warm-surface px-2 py-1">
                    {t("tests.executions.detail.deviceLabel")}:{" "}
                    {detail.deviceInfo}
                  </span>
                ) : null}
                {detail.appVersion ? (
                  <span className="rounded-full bg-warm-surface px-2 py-1">
                    {t("tests.executions.detail.versionLabel")}:{" "}
                    {detail.appVersion}
                  </span>
                ) : null}
              </div>
            ) : null}

            {detail.attachments.length > 0 ? (
              <div>
                <p className="font-heading text-sm font-semibold text-text-primary">
                  {t("tests.executions.detail.attachmentsLabel")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.attachments.map((attachment) => (
                    <img
                      key={attachment.id}
                      src={attachment.url}
                      alt={attachment.fileName}
                      className="h-20 w-20 rounded-[10px] object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {canEdit ? (
              <button
                type="button"
                onClick={openEdit}
                data-testid="execution-edit-btn"
                className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary-dark"
              >
                {t("tests.executions.detail.editFab")}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <SuccessRedirectToast
        open={showSuccess}
        title={t("tests.executions.edit.toastSuccessTitle")}
        description={t("tests.executions.edit.toastSuccessMessage")}
        durationSeconds={2}
        onComplete={() => setShowSuccess(false)}
      />
    </AppShell>
  );
}
