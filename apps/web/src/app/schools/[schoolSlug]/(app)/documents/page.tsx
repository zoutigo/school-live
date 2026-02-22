"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, FileBadge2, GraduationCap, ReceiptText } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { Card } from "../../../../../components/ui/card";

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
};

type TabKey = "notes" | "factures" | "inscriptions";
type ArchiveYear = "2025-2026" | "2024-2025" | "2023-2024";

type DocRow = {
  id: string;
  title: string;
  date: string;
  child: string;
};

const notesByYear: Record<ArchiveYear, DocRow[]> = {
  "2025-2026": [
    {
      id: "n-1",
      title: "Bulletin 1er trimestre - Paul MBELE",
      date: "05 janvier 2026",
      child: "Paul MBELE",
    },
    {
      id: "n-2",
      title: "Releve de notes mi-semestre - Lisa MBELE",
      date: "12 fevrier 2026",
      child: "Lisa MBELE",
    },
  ],
  "2024-2025": [
    {
      id: "n-3",
      title: "Bulletin annuel - Paul MBELE",
      date: "18 juillet 2025",
      child: "Paul MBELE",
    },
  ],
  "2023-2024": [],
};

const invoicesByYear: Record<ArchiveYear, DocRow[]> = {
  "2025-2026": [
    {
      id: "f-1",
      title: "Facture 2604 - Scolarite T2",
      date: "16 janvier 2026",
      child: "Famille MBELE",
    },
    {
      id: "f-2",
      title: "Facture 2661 - Cantine fevrier",
      date: "02 fevrier 2026",
      child: "Famille MBELE",
    },
    {
      id: "f-3",
      title: "Facture 2698 - Activites pedagogiques",
      date: "17 fevrier 2026",
      child: "Famille MBELE",
    },
  ],
  "2024-2025": [
    {
      id: "f-4",
      title: "Facture 2477 du 15 octobre",
      date: "15 octobre 2025",
      child: "Famille MBELE",
    },
  ],
  "2023-2024": [],
};

const registrationByYear: Record<ArchiveYear, DocRow[]> = {
  "2025-2026": [
    {
      id: "r-1",
      title: "Fiche de re-inscription - Paul MBELE",
      date: "23 aout 2025",
      child: "Paul MBELE",
    },
    {
      id: "r-2",
      title: "Autorisation parentale - sortie annuelle",
      date: "10 janvier 2026",
      child: "Lisa MBELE",
    },
  ],
  "2024-2025": [],
  "2023-2024": [],
};

function Section({
  title,
  subtitle,
  icon,
  rows,
  dateLabel,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  rows: DocRow[];
  dateLabel: string;
}) {
  return (
    <section className="rounded-card border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-primary">
            {icon}
          </span>
          <div>
            <h3 className="text-sm font-heading font-semibold text-text-primary">
              {title}
            </h3>
            <p className="text-xs text-text-secondary">{subtitle}</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm font-semibold text-text-primary">
            Aucun document disponible
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Les nouveaux documents apparaitront ici.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="grid gap-2 md:hidden">
            {rows.map((row) => (
              <article
                key={row.id}
                className="rounded-card border border-border bg-surface px-3 py-2"
              >
                <p className="text-sm font-semibold text-text-primary">
                  {row.title}
                </p>
                <p className="mt-1 text-xs text-text-secondary">{row.child}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-text-secondary">{row.date}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    iconLeft={<Download className="h-3.5 w-3.5" />}
                  >
                    PDF
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-card border border-border md:block">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-background text-left text-text-secondary">
                  <th className="px-3 py-2 font-semibold">Document</th>
                  <th className="px-3 py-2 font-semibold">{dateLabel}</th>
                  <th className="px-3 py-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-text-primary">
                        {row.title}
                      </p>
                      <p className="text-xs text-text-secondary">{row.child}</p>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {row.date}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        iconLeft={<Download className="h-3.5 w-3.5" />}
                      >
                        Telecharger
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ParentDocumentsPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tab, setTab] = useState<TabKey>("notes");
  const [archive, setArchive] = useState<ArchiveYear>("2025-2026");

  useEffect(() => {
    void loadProfile();
  }, [schoolSlug]);

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
  }

  const currentRows = useMemo(() => {
    if (tab === "notes") {
      return notesByYear[archive];
    }
    if (tab === "factures") {
      return invoicesByYear[archive];
    }
    return registrationByYear[archive];
  }, [tab, archive]);

  return (
    <div className="grid gap-4">
      <Card
        title="Documents"
        subtitle={
          me
            ? `${me.firstName} ${me.lastName} - centralisez vos documents scolaires`
            : "Chargement..."
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-card border border-primary/25 bg-gradient-to-br from-[#E8F4FF] via-[#F4FAFF] to-surface p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Archive selectionnee
                  </p>
                  <p className="mt-1 text-xl font-heading font-bold text-primary">
                    {archive}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Total documents visibles
                  </p>
                  <p className="mt-1 text-xl font-heading font-bold text-primary">
                    {currentRows.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="-mx-1 flex items-end gap-1 overflow-x-auto border-b border-border px-1 pb-1">
                {(
                  [
                    { key: "notes", label: "Notes" },
                    { key: "factures", label: "Factures" },
                    {
                      key: "inscriptions",
                      label: "Inscription / Re-inscription",
                    },
                  ] as const
                ).map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => setTab(entry.key)}
                    className={`shrink-0 rounded-t-card px-3 py-2 text-sm font-heading font-semibold ${
                      tab === entry.key
                        ? "border border-border border-b-surface bg-surface text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>

              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-secondary">
                  Acces aux archives
                </span>
                <select
                  value={archive}
                  onChange={(event) =>
                    setArchive(event.target.value as ArchiveYear)
                  }
                  className="rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                </select>
              </label>
            </div>

            {tab === "notes" ? (
              <Section
                title="Notes et bulletins"
                subtitle="Pour vos enfants scolarises"
                icon={<FileBadge2 className="h-4 w-4" />}
                rows={notesByYear[archive]}
                dateLabel="Date de mise en ligne"
              />
            ) : null}

            {tab === "factures" ? (
              <Section
                title="Factures"
                subtitle="Documents comptables de la famille"
                icon={<ReceiptText className="h-4 w-4" />}
                rows={invoicesByYear[archive]}
                dateLabel="Date de mise en ligne"
              />
            ) : null}

            {tab === "inscriptions" ? (
              <Section
                title="Inscription / Re-inscription"
                subtitle="Formulaires administratifs et signatures"
                icon={<GraduationCap className="h-4 w-4" />}
                rows={registrationByYear[archive]}
                dateLabel="Date de signature"
              />
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
