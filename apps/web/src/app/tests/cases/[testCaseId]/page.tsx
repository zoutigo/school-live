"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../../../components/layout/app-shell";
import { BackLinkButton } from "../../../../components/ui/back-link-button";
import {
  FormFileInput,
  FormSelect,
  FormTextarea,
} from "../../../../components/ui/form-controls";
import { SuccessRedirectToast } from "../../../../components/ui/success-redirect-toast";
import { useTranslation } from "../../../../i18n/useTranslation";
import {
  testsApi,
  type TestCaseDetail,
  type TestExecutionStatus,
} from "../../../../api/tests.api";
import {
  formatDateTime,
  statusLabel,
} from "../../../../components/tests/tests-format";

const SUBMIT_STATUSES: TestExecutionStatus[] = [
  "PASSED",
  "FAILED",
  "BLOCKED",
  "SKIPPED",
  "IN_PROGRESS",
];

type SubmitStatus = "PASSED" | "FAILED" | "BLOCKED" | "SKIPPED" | "IN_PROGRESS";

type FormValues = {
  status: SubmitStatus | "";
  resultText: string;
  comment: string;
};

function buildSchema(t: (key: string) => string) {
  return z.object({
    status: z
      .enum(["PASSED", "FAILED", "BLOCKED", "SKIPPED", "IN_PROGRESS", ""])
      .refine((value) => value !== "", {
        message: t("tests.detail.validation.statusRequired"),
      }),
    resultText: z
      .string()
      .trim()
      .min(1, t("tests.detail.validation.resultRequired")),
    comment: z.string(),
  });
}

export default function TestCaseDetailPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const params = useParams<{ testCaseId: string }>();
  const testCaseId = params.testCaseId;
  const [detail, setDetail] = useState<TestCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [specOpen, setSpecOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const resultRef = useRef<HTMLTextAreaElement | null>(null);
  const statusRef = useRef<HTMLSelectElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await testsApi.getTestCase(testCaseId);
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
  }, [testCaseId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const evidenceRequired = Boolean(detail?.evidenceRequired);
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
    defaultValues: { status: "", resultText: "", comment: "" },
  });

  function openForm() {
    reset({ status: "", resultText: "", comment: "" });
    setAttachments([]);
    setSubmitError(null);
    setShowForm(true);
  }

  const onValid = handleSubmit(
    async (values) => {
      if (evidenceRequired && attachments.length === 0) {
        setSubmitError(t("tests.detail.validation.attachmentsRequired"));
        return;
      }
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await testsApi.createExecution(testCaseId, {
          status: values.status as TestExecutionStatus,
          resultText: values.resultText.trim(),
          comment: values.comment.trim() || undefined,
          deviceInfo: "web",
          attachments,
        });
        setShowForm(false);
        setShowSuccess(true);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : t("tests.common.errors.submitGeneric"),
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    (formErrors) => {
      if (formErrors.status) statusRef.current?.focus();
      else if (formErrors.resultText) resultRef.current?.focus();
    },
  );

  const hasResults = !!detail?.latestOwnExecution;

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <BackLinkButton
          href={detail ? `/tests/${detail.campaign.id}` : "/tests"}
        >
          {t("common.back")}
        </BackLinkButton>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-text-secondary">
            {t("common.loading")}
          </div>
        ) : errorMessage || !detail ? (
          <p className="text-sm text-notification" data-testid="test-case-error">
            {errorMessage ?? t("tests.common.errors.loadGeneric")}
          </p>
        ) : (
          <>
            <div
              className="rounded-[20px] bg-[#c0681a] p-6 text-surface"
              data-testid="test-case-hero"
            >
              <p className="text-sm text-surface/80">{detail.campaign.title}</p>
              <h1 className="mt-1 text-xl font-bold">{detail.title}</h1>
            </div>

            <button
              type="button"
              onClick={() => setSpecOpen((value) => !value)}
              data-testid="test-case-spec-toggle"
              className="w-full rounded-[10px] border border-primary bg-surface py-3 text-sm font-semibold text-primary"
            >
              {t(
                specOpen
                  ? "tests.detail.hideSpecToggle"
                  : "tests.detail.viewSpecToggle",
              )}
            </button>

            {specOpen ? (
              <div className="space-y-3" data-testid="test-case-spec-box">
                <SpecCard
                  title={t("tests.detail.objective")}
                  value={detail.objective}
                />
                <SpecCard
                  title={t("tests.detail.preconditions")}
                  value={detail.preconditions}
                />
                <SpecCard
                  title={t("tests.detail.expectedResult")}
                  value={detail.expectedResult}
                />
                <div className="rounded-[16px] border border-warm-border bg-surface p-4">
                  <p className="font-heading text-sm font-semibold text-text-primary">
                    {t("tests.detail.steps")}
                  </p>
                  {detail.steps.length === 0 ? (
                    <p className="mt-1 text-sm text-text-secondary">
                      {t("tests.detail.noSteps")}
                    </p>
                  ) : (
                    <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-text-primary">
                      {detail.steps.map((step, index) => (
                        <li key={`${index}-${step}`}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            ) : null}

            {detail.latestOwnExecution?.reworkRequestedAt ? (
              <div
                className="rounded-[14px] border border-[#f0c9c2] bg-[#fbe3e1] p-4"
                data-testid="test-case-rework-banner"
              >
                <p className="font-heading text-sm font-bold text-[#b3261e]">
                  {t("tests.detail.reworkBanner.title")}
                </p>
                <p className="mt-1 text-sm text-[#7a241d]">
                  {detail.latestOwnExecution.reworkNote?.trim() ||
                    t("tests.detail.reworkBanner.noNote")}
                </p>
              </div>
            ) : null}

            <div className="rounded-[16px] border border-warm-border bg-surface p-4">
              <p className="font-heading text-sm font-semibold text-text-primary">
                {t("tests.detail.completedBy")}
              </p>
              {detail.completedByUsers.length === 0 ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {t("tests.detail.noCompletedUsers")}
                </p>
              ) : (
                <ul className="mt-1 divide-y divide-warm-border text-sm">
                  {detail.completedByUsers.map((entry) => (
                    <li key={entry.userId} className="py-1.5">
                      <p className="font-semibold text-text-primary">
                        {entry.fullName}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {statusLabel(t, entry.status)} ·{" "}
                        {formatDateTime(entry.executedAt, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[16px] border border-warm-border bg-surface p-4">
              <p className="font-heading text-sm font-semibold text-text-primary">
                {t("tests.detail.historyTitle")}
              </p>
              {detail.executions.length === 0 ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {t("tests.detail.historyEmpty")}
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  {detail.executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="rounded-[12px] bg-warm-surface p-3"
                    >
                      <p className="text-sm font-semibold text-text-primary">
                        {execution.user.fullName} ·{" "}
                        {statusLabel(t, execution.status)}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatDateTime(execution.executedAt, locale)}
                      </p>
                      {execution.resultText ? (
                        <p className="mt-1 text-sm text-text-primary">
                          {execution.resultText}
                        </p>
                      ) : null}
                      {execution.comment ? (
                        <p className="text-sm text-text-secondary">
                          {execution.comment}
                        </p>
                      ) : null}
                      {execution.attachments.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {execution.attachments.map((attachment) => (
                            <img
                              key={attachment.id}
                              src={attachment.url}
                              alt={attachment.fileName}
                              className="h-20 w-20 rounded-[10px] object-cover"
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!showForm ? (
              <div className="flex flex-wrap gap-3">
                {hasResults && detail.latestOwnExecution ? (
                  <a
                    href={`/tests/executions/${detail.latestOwnExecution.id}`}
                    data-testid="tests-view-results-btn"
                    className="rounded-card border border-warm-border bg-warm-surface px-4 py-2 text-sm font-semibold text-text-primary"
                  >
                    {t("tests.detail.viewResults")}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={openForm}
                  data-testid="tests-submit-result-btn"
                  className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary-dark"
                >
                  {t("tests.detail.fabAdd")}
                </button>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void onValid();
                }}
                className="space-y-4 rounded-[20px] border border-warm-border bg-surface p-5"
                data-testid="tests-submit-form"
              >
                <p className="font-heading text-base font-semibold text-text-primary">
                  {t("tests.detail.formModalTitle")}
                </p>

                <div>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <FormSelect
                        {...field}
                        ref={statusRef}
                        invalid={!!errors.status}
                        data-testid="tests-submit-status"
                      >
                        <option value="">
                          {t("tests.detail.statusPlaceholder")}
                        </option>
                        {SUBMIT_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {statusLabel(t, value)}
                          </option>
                        ))}
                      </FormSelect>
                    )}
                  />
                  {errors.status ? (
                    <p className="mt-1 text-xs font-semibold text-notification">
                      {errors.status.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <Controller
                    control={control}
                    name="resultText"
                    render={({ field }) => (
                      <FormTextarea
                        {...field}
                        ref={resultRef}
                        invalid={!!errors.resultText}
                        placeholder={t("tests.detail.resultPlaceholder")}
                        rows={4}
                        data-testid="tests-result-input"
                      />
                    )}
                  />
                  {errors.resultText ? (
                    <p className="mt-1 text-xs font-semibold text-notification">
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
                      placeholder={t("tests.detail.commentPlaceholder")}
                      rows={3}
                    />
                  )}
                />

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-secondary">
                    {t("tests.detail.attachments.add")}
                  </label>
                  <FormFileInput
                    multiple
                    accept="image/*,.pdf"
                    data-testid="tests-attach-input"
                    onChange={(event) =>
                      setAttachments((prev) => [
                        ...prev,
                        ...Array.from(event.target.files ?? []),
                      ])
                    }
                  />
                  {attachments.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {attachments.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-[8px] border border-warm-border bg-warm-surface px-3 py-1.5 text-xs text-text-secondary"
                        >
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setAttachments((prev) =>
                                prev.filter((_, i) => i !== index),
                              )
                            }
                            aria-label={t("tests.detail.attachments.removeLabel")}
                            className="text-text-secondary hover:text-notification"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {submitError ? (
                  <p className="text-sm text-notification">{submitError}</p>
                ) : null}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-card border border-warm-border bg-warm-surface py-3 text-sm font-semibold text-text-primary"
                  >
                    {t("tests.common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="tests-submit-btn"
                    className="flex-[2] rounded-card bg-primary py-3 text-sm font-semibold text-surface hover:bg-primary-dark disabled:opacity-60"
                  >
                    {isSubmitting
                      ? t("tests.detail.submitting")
                      : t("tests.detail.submit")}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      <SuccessRedirectToast
        open={showSuccess}
        title={t("tests.detail.toastSuccessTitle")}
        description={t("tests.detail.toastSuccessMessage")}
        durationSeconds={2}
        onComplete={() => {
          setShowSuccess(false);
          void load();
          router.refresh();
        }}
      />
    </AppShell>
  );
}

function SpecCard({ title, value }: { title: string; value: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[16px] border border-warm-border bg-surface p-4">
      <p className="font-heading text-sm font-semibold text-text-primary">
        {title}
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        {value?.trim() || t("tests.common.noValue")}
      </p>
    </div>
  );
}
