"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";
import { useTranslation } from "../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ResourcePart = "statement" | "correction";

type SubmissionRow = {
  id: string;
  content: string;
  createdAt: string;
  authorUser: { id: string; firstName: string; lastName: string };
  resource: {
    id: string;
    kind: "ASSESSMENT" | "EXAM";
    title: string;
    examType: string;
    sequence: string | null;
    school: { id: string; name: string } | null;
    academicLevel: { id: string; label: string };
    subject: { id: string; name: string };
  };
};

type ListResponse = {
  items: SubmissionRow[];
  total: number;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AdminResourcesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [part, setPart] = useState<ResourcePart>("statement");
  const [items, setItems] = useState<SubmissionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPart: ResourcePart) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/admin/resources/submissions?part=${nextPart}&status=AWAITING`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error("LOAD_FAILED");
        }
        const data = (await res.json()) as ListResponse;
        setItems(data.items);
      } catch {
        setError(t("resourcesModeration.errors.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load(part);
  }, [ready, part, load]);

  async function boot() {
    try {
      const meRes = await fetch(`${API_URL}/me`, { credentials: "include" });
      if (!meRes.ok) {
        router.replace("/");
        return;
      }
      const me = (await meRes.json()) as { activeRole?: string | null };
      if (!["SUPER_ADMIN", "ADMIN"].includes(me.activeRole ?? "")) {
        router.replace("/acceuil");
        return;
      }
    } catch {
      router.replace("/");
      return;
    } finally {
      setReady(true);
    }
  }

  if (!ready) {
    return (
      <AppShell schoolName="Scolive Platform">
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">
            {t("resourcesModeration.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("resourcesModeration.subtitle")}
          </p>
        </div>

        <div className="flex gap-2 border-b border-warm-border">
          {(
            [
              ["statement", t("resourcesModeration.tabs.statement")],
              ["correction", t("resourcesModeration.tabs.correction")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-testid={`admin-resources-tab-${key}`}
              onClick={() => setPart(key)}
              className={`px-4 py-2 text-sm font-semibold ${
                part === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : items.length === 0 ? (
          <div
            className="text-sm text-muted-foreground"
            data-testid="admin-resources-empty"
          >
            {t("resourcesModeration.empty")}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card
                key={item.id}
                data-testid={`admin-resources-card-${item.id}`}
                className="cursor-pointer transition hover:border-primary"
                onClick={() =>
                  router.push(
                    `/admin-resources/${item.id}?resourceId=${item.resource.id}&part=${part}`,
                  )
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-heading text-lg font-semibold">
                      {item.resource.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.resource.subject.name} •{" "}
                      {item.resource.academicLevel.label}
                      {item.resource.school
                        ? ` • ${item.resource.school.name}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("resourcesModeration.authorPrefix")}
                      {item.authorUser.firstName} {item.authorUser.lastName}
                    </p>
                  </div>
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                </div>

                <p
                  className="mt-3 line-clamp-2 text-sm text-foreground"
                  data-testid={`admin-resources-content-${item.id}`}
                >
                  {stripHtml(item.content)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
