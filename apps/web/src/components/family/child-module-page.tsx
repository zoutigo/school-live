"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "../ui/card";
import { ModuleHelpTab } from "../ui/module-help-tab";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
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
        linkedStudents?: ParentChild[];
      };

      if (payload.role !== "PARENT") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      const list = payload.linkedStudents ?? [];
      setChildren(list);

      if (list.length > 0 && !list.some((entry) => entry.id === childId)) {
        router.replace(
          `/schools/${schoolSlug}/children/${list[0].id}/${currentTab}`,
        );
      }
    } catch {
      setError("Impossible de charger le profil parent.");
    } finally {
      setLoading(false);
    }
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  return (
    <div className="grid gap-4">
      <Card
        title={title}
        subtitle={
          currentChild
            ? `${subtitle} - ${currentChild.lastName} ${currentChild.firstName}`
            : subtitle
        }
      >
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
          <div className="rounded-card border border-border bg-background p-4 text-sm">
            <p className="font-medium text-text-primary">{summary}</p>
            <ul className="mt-2 grid gap-1 text-text-secondary">
              {bullets.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
