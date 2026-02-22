"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "../ui/card";
import { ModuleHelpTab } from "../ui/module-help-tab";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
  className?: string | null;
};

type TabKey =
  | "accueil"
  | "vie-scolaire"
  | "vie-de-classe"
  | "notes"
  | "messagerie"
  | "cahier-de-texte"
  | "manuels-ressources"
  | "formulaires-sondages";

type Props = {
  schoolSlug: string;
  childId: string;
  currentTab: TabKey;
  title: string;
  subtitle: string;
  summary: string;
  bullets: string[];
  content?:
    | ReactNode
    | ((ctx: { child: ParentChild | null; loading: boolean }) => ReactNode);
  hidePrimaryTabs?: boolean;
  hideSecondaryTabs?: boolean;
  hideModuleHeader?: boolean;
};

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: "accueil", label: "Accueil" },
  { key: "vie-scolaire", label: "Vie scolaire" },
  { key: "vie-de-classe", label: "Vie de classe" },
  { key: "notes", label: "Notes" },
  { key: "messagerie", label: "Messagerie" },
  { key: "cahier-de-texte", label: "Cahier de texte" },
  { key: "manuels-ressources", label: "Manuels & resources" },
  { key: "formulaires-sondages", label: "Formulaires & sondages" },
];

export function ChildModulePage({
  schoolSlug,
  childId,
  currentTab,
  title,
  subtitle,
  summary,
  bullets,
  content,
  hidePrimaryTabs = false,
  hideSecondaryTabs = false,
  hideModuleHeader = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"content" | "help">("content");
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadParentChildren();
  }, [schoolSlug]);

  async function loadParentChildren() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }

      const payload = (await response.json()) as {
        role?: string;
        linkedStudents?: Array<{
          id: string;
          firstName: string;
          lastName: string;
          currentEnrollment?: {
            class?: {
              name?: string;
            } | null;
          } | null;
        }>;
      };

      if (payload.role !== "PARENT") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      const list: ParentChild[] = (payload.linkedStudents ?? []).map(
        (entry) => ({
          id: entry.id,
          firstName: entry.firstName,
          lastName: entry.lastName,
          className: entry.currentEnrollment?.class?.name ?? null,
        }),
      );

      const enrichedList = await Promise.all(
        list.map(async (entry) => {
          if (entry.className) {
            return entry;
          }

          const className = await loadChildClassName(schoolSlug, entry.id);
          return {
            ...entry,
            className,
          };
        }),
      );

      setChildren(enrichedList);

      if (
        enrichedList.length > 0 &&
        !enrichedList.some((entry) => entry.id === childId)
      ) {
        router.replace(
          `/schools/${schoolSlug}/children/${enrichedList[0].id}/${currentTab}`,
        );
      }
    } catch {
      setError("Impossible de charger le profil parent.");
    } finally {
      setLoading(false);
    }
  }

  async function loadChildClassName(
    currentSchoolSlug: string,
    currentChildId: string,
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/students/${currentChildId}/life-events?scope=current&limit=1`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as Array<{
        class?: { name?: string | null } | null;
      }>;

      return payload[0]?.class?.name?.trim() || null;
    } catch {
      return null;
    }
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  return (
    <div className="grid gap-4">
      <Card
        title={hideModuleHeader ? undefined : title}
        subtitle={
          hideModuleHeader
            ? undefined
            : currentChild
              ? `${subtitle} - ${currentChild.lastName} ${currentChild.firstName}`
              : subtitle
        }
      >
        {hidePrimaryTabs ? null : (
          <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border">
            {TAB_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={`/schools/${schoolSlug}/children/${childId}/${item.key}`}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  currentTab === item.key
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {hideSecondaryTabs ? null : (
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("content")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "content"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Vue
            </button>
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "help"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Aide
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : tab === "help" ? (
          <ModuleHelpTab
            moduleName={title}
            moduleSummary={summary}
            actions={[
              {
                name: "Consulter",
                purpose:
                  "suivre les informations de votre enfant dans ce module.",
                howTo:
                  "selectionner votre enfant dans le menu lateral puis utiliser les onglets de ce module.",
                moduleImpact:
                  "vous obtenez une vue ciblee par enfant pour ce domaine.",
                crossModuleImpact:
                  "la navigation reste coherente avec notes, vie scolaire et communication.",
              },
            ]}
          />
        ) : (
          ((typeof content === "function"
            ? content({ child: currentChild, loading })
            : content) ?? (
            <div className="rounded-card border border-border bg-background p-4 text-sm">
              <p className="font-medium text-text-primary">{summary}</p>
              <ul className="mt-2 grid gap-1 text-text-secondary">
                {bullets.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
