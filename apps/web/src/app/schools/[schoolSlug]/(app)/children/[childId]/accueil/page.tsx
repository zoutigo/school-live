"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  MessageSquare,
  ShieldAlert,
  Users,
} from "lucide-react";
import { ChildModulePage } from "../../../../../../../components/family/child-module-page";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ChildContext = {
  id: string;
  firstName: string;
  lastName: string;
  className?: string | null;
};

type NotesSnapshot = {
  label: string;
  generatedAtLabel: string;
  generalAverage: {
    student: number | null;
  };
  subjects: Array<{
    id: string;
    subjectLabel: string;
    studentAverage: number | null;
  }>;
};

type LifeEventRow = {
  id: string;
  type: "ABSENCE" | "RETARD" | "SANCTION" | "PUNITION";
  occurredAt: string;
  reason: string;
  justified?: boolean | null;
};

type TimetableOccurrence = {
  id: string;
  occurrenceDate: string;
  startMinute: number;
  endMinute: number;
  room?: string | null;
  status?: string | null;
  subject: { name: string };
  teacherUser: { firstName: string; lastName: string };
};

type TimetableResponse = {
  student: { firstName: string; lastName: string };
  class: { name: string };
  occurrences: TimetableOccurrence[];
};

type MessagesListResponse = {
  items: Array<{
    id: string;
    subject: string;
    preview?: string | null;
    createdAt: string;
    unread?: boolean;
    sender?: { firstName: string; lastName: string } | null;
  }>;
};

function formatScore(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value % 1 === 0 ? `${value}` : value.toFixed(2).replace(".", ",");
}

function minuteToTimeLabel(value: number) {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatEventTypeLabel(type: LifeEventRow["type"]) {
  if (type === "ABSENCE") return "Absence";
  if (type === "RETARD") return "Retard";
  if (type === "SANCTION") return "Sanction";
  return "Punition";
}

function formatDateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ChildAccueilDashboard({
  schoolSlug,
  childId,
  child,
}: {
  schoolSlug: string;
  childId: string;
  child: ChildContext | null;
}) {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<NotesSnapshot[]>([]);
  const [events, setEvents] = useState<LifeEventRow[]>([]);
  const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
  const [messages, setMessages] = useState<MessagesListResponse["items"]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [
          notesResponse,
          eventsResponse,
          timetableResponse,
          unreadResponse,
          messagesResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/schools/${schoolSlug}/students/${childId}/notes`, {
            credentials: "include",
          }),
          fetch(
            `${API_URL}/schools/${schoolSlug}/students/${childId}/life-events?scope=current&limit=20`,
            {
              credentials: "include",
            },
          ),
          fetch(
            `${API_URL}/schools/${schoolSlug}/timetable/me?childId=${encodeURIComponent(childId)}`,
            {
              credentials: "include",
            },
          ),
          fetch(`${API_URL}/schools/${schoolSlug}/messages/unread-count`, {
            credentials: "include",
          }),
          fetch(
            `${API_URL}/schools/${schoolSlug}/messages?folder=inbox&page=1&limit=5`,
            {
              credentials: "include",
            },
          ),
        ]);

        if (!cancelled) {
          setNotes(
            notesResponse.ok
              ? (((await notesResponse.json()) as NotesSnapshot[]) ?? [])
              : [],
          );
          setEvents(
            eventsResponse.ok
              ? (((await eventsResponse.json()) as LifeEventRow[]) ?? [])
              : [],
          );
          setTimetable(
            timetableResponse.ok
              ? ((await timetableResponse.json()) as TimetableResponse)
              : null,
          );
          setUnreadCount(
            unreadResponse.ok
              ? Number(
                  ((await unreadResponse.json()) as { unread?: number })
                    .unread ?? 0,
                )
              : 0,
          );
          setMessages(
            messagesResponse.ok
              ? (((await messagesResponse.json()) as MessagesListResponse)
                  .items ?? [])
              : [],
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [childId, schoolSlug]);

  const latestSnapshot = notes[0] ?? null;
  const nextOccurrence = useMemo(() => {
    const now = Date.now();

    return (
      timetable?.occurrences
        ?.filter((entry) => (entry.status ?? "PLANNED") === "PLANNED")
        .sort((a, b) =>
          `${a.occurrenceDate}-${a.startMinute}`.localeCompare(
            `${b.occurrenceDate}-${b.startMinute}`,
          ),
        )
        .find((entry) => {
          const startAt = new Date(
            `${entry.occurrenceDate}T${minuteToTimeLabel(entry.startMinute)}:00`,
          ).getTime();
          return startAt >= now - 15 * 60 * 1000;
        }) ?? null
    );
  }, [timetable]);
  const latestMessage = messages[0] ?? null;
  const unjustifiedCount = events.filter(
    (entry) => entry.type === "ABSENCE" && entry.justified === false,
  ).length;
  const sanctionsCount = events.filter(
    (entry) => entry.type === "SANCTION" || entry.type === "PUNITION",
  ).length;
  const latestEvent = events[0] ?? null;
  const bestSubject = useMemo(() => {
    return [...(latestSnapshot?.subjects ?? [])]
      .filter((entry) => entry.studentAverage !== null)
      .sort((a, b) => (b.studentAverage ?? 0) - (a.studentAverage ?? 0))[0];
  }, [latestSnapshot]);
  const studentLabel = child
    ? `${child.lastName.toUpperCase()} ${child.firstName}`
    : "Votre enfant";

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-[24px] border border-primary/15 bg-[linear-gradient(145deg,rgba(10,98,191,0.14),rgba(255,255,255,0.98)_48%,rgba(28,154,138,0.14))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-surface/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              Tableau de bord enfant
            </span>
            <div>
              <h2 className="font-heading text-2xl font-semibold text-text-primary">
                {studentLabel}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {child?.className
                  ? `Vue synthese des modules de ${child.className}.`
                  : "Vue synthese des modules de votre enfant."}
              </p>
            </div>
            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              <SummaryStat
                label="Moyenne generale"
                value={formatScore(
                  latestSnapshot?.generalAverage.student ?? null,
                )}
                hint={latestSnapshot?.label ?? "Aucune periode publiee"}
                accent="primary"
              />
              <SummaryStat
                label="Messages non lus"
                value={`${unreadCount}`}
                hint={
                  latestMessage?.subject
                    ? `Dernier : ${latestMessage.subject}`
                    : "Aucun message recent"
                }
                accent="teal"
              />
              <SummaryStat
                label="Vie scolaire"
                value={`${events.length}`}
                hint={
                  unjustifiedCount > 0
                    ? `${unjustifiedCount} absence non justifiee`
                    : sanctionsCount > 0
                      ? `${sanctionsCount} sanction(s) ou punition(s)`
                      : "Aucun point de vigilance"
                }
                accent="gold"
              />
            </div>
          </div>

          <div className="rounded-[20px] border border-white/70 bg-white/80 p-4 shadow-[0_12px_28px_rgba(10,98,191,0.08)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
              <Clock3 className="h-4 w-4 text-primary" />
              Aujourd'hui
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-text-secondary">Chargement...</p>
            ) : nextOccurrence ? (
              <div className="mt-4 grid gap-2">
                <p className="font-heading text-lg font-semibold text-text-primary">
                  {minuteToTimeLabel(nextOccurrence.startMinute)} -{" "}
                  {minuteToTimeLabel(nextOccurrence.endMinute)} ·{" "}
                  {nextOccurrence.subject.name}
                </p>
                <p className="text-sm text-text-secondary">
                  {nextOccurrence.teacherUser.lastName.toUpperCase()}{" "}
                  {nextOccurrence.teacherUser.firstName}
                </p>
                <p className="text-sm font-medium text-primary">
                  {nextOccurrence.room?.trim()
                    ? `Salle ${nextOccurrence.room}`
                    : "Salle a confirmer"}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-secondary">
                Aucun prochain cours identifiable pour le moment.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardPanel
              title="Suivi scolaire"
              icon={<BookOpen className="h-4 w-4" />}
              actionHref={`/schools/${schoolSlug}/children/${childId}/notes`}
              actionLabel="Voir les notes"
            >
              <div className="grid gap-3">
                <p className="text-sm text-text-secondary">
                  {latestSnapshot
                    ? `Derniere periode publiee : ${latestSnapshot.label}`
                    : "Aucune note publiee pour le moment."}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricBadge
                    label="Moyenne"
                    value={formatScore(
                      latestSnapshot?.generalAverage.student ?? null,
                    )}
                  />
                  <MetricBadge
                    label="Matiere forte"
                    value={
                      bestSubject
                        ? `${bestSubject.subjectLabel} · ${formatScore(bestSubject.studentAverage)}`
                        : "-"
                    }
                  />
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Vie scolaire"
              icon={<ShieldAlert className="h-4 w-4" />}
              actionHref={`/schools/${schoolSlug}/children/${childId}/vie-scolaire`}
              actionLabel="Voir la synthese"
            >
              <div className="grid gap-3">
                <p className="text-sm text-text-secondary">
                  {latestEvent
                    ? `${formatEventTypeLabel(latestEvent.type)} : ${latestEvent.reason}`
                    : "Aucun evenement vie scolaire recent."}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricBadge
                    label="Absences non justifiees"
                    value={`${unjustifiedCount}`}
                  />
                  <MetricBadge
                    label="Sanctions / punitions"
                    value={`${sanctionsCount}`}
                  />
                </div>
              </div>
            </DashboardPanel>
          </div>

          <DashboardPanel
            title="Acces rapides"
            icon={<CalendarDays className="h-4 w-4" />}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  label: "Notes",
                  hint: "Evaluations et moyennes",
                  href: `/schools/${schoolSlug}/children/${childId}/notes`,
                },
                {
                  label: "Vie scolaire",
                  hint: "Absences, retards, sanctions",
                  href: `/schools/${schoolSlug}/children/${childId}/vie-scolaire`,
                },
                {
                  label: "Vie de classe",
                  hint: "Fil et actualites de classe",
                  href: `/schools/${schoolSlug}/children/${childId}/vie-de-classe`,
                },
                {
                  label: "Emploi du temps",
                  hint: "Cours et prochains creneaux",
                  href: `/schools/${schoolSlug}/emploi-du-temps?childId=${encodeURIComponent(
                    childId,
                  )}`,
                },
                {
                  label: "Messagerie",
                  hint: "Echanges et suivi",
                  href: `/schools/${schoolSlug}/children/${childId}/messagerie`,
                },
                {
                  label: "Cahier de texte",
                  hint: "Travail et consignes",
                  href: `/schools/${schoolSlug}/children/${childId}/cahier-de-texte`,
                },
              ].map((entry) => (
                <Link
                  key={entry.label}
                  href={entry.href}
                  className="rounded-[18px] border border-border bg-background px-4 py-4 transition hover:border-primary/30 hover:shadow-card"
                >
                  <p className="font-heading text-base font-semibold text-text-primary">
                    {entry.label}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {entry.hint}
                  </p>
                </Link>
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="grid gap-4">
          <DashboardPanel
            title="Dernier message"
            icon={<MessageSquare className="h-4 w-4" />}
            actionHref={`/schools/${schoolSlug}/children/${childId}/messagerie`}
            actionLabel="Ouvrir la messagerie"
          >
            {latestMessage ? (
              <div className="grid gap-2">
                <p className="font-heading text-base font-semibold text-text-primary">
                  {latestMessage.subject}
                </p>
                <p className="text-sm text-text-secondary">
                  {latestMessage.preview?.trim() || "Apercu non disponible."}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatDateLabel(latestMessage.createdAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Aucun message recent.
              </p>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Vie de classe"
            icon={<Users className="h-4 w-4" />}
            actionHref={`/schools/${schoolSlug}/children/${childId}/vie-de-classe`}
            actionLabel="Voir la vie de classe"
          >
            <div className="grid gap-2 text-sm text-text-secondary">
              <p>
                L'accueil enfant regroupe maintenant les indicateurs utiles pour
                eviter de dupliquer le fil dans plusieurs espaces.
              </p>
              <p>
                Le fil d'actualite et les informations collectives de la classe
                sont regroupes dans{" "}
                <span className="font-semibold text-text-primary">
                  Vie de classe
                </span>
                .
              </p>
              <p>
                {child?.className
                  ? `Accedez aux publications, rappels et temps forts de ${child.className}.`
                  : "Accedez aux publications, rappels et temps forts de la classe."}
              </p>
            </div>
          </DashboardPanel>
        </div>
      </section>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: "primary" | "teal" | "gold";
}) {
  const accentClass =
    accent === "primary"
      ? "from-primary/15 to-primary/5 text-primary"
      : accent === "teal"
        ? "from-[#1C9A8A]/15 to-[#1C9A8A]/5 text-[#1C9A8A]"
        : "from-[#D4952F]/15 to-[#D4952F]/5 text-[#9A5C00]";

  return (
    <div
      className={`rounded-[18px] border border-white/70 bg-gradient-to-br ${accentClass} px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{hint}</p>
    </div>
  );
}

function DashboardPanel({
  title,
  icon,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="rounded-[20px] border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </span>
          <h3 className="font-heading text-lg font-semibold text-text-primary">
            {title}
          </h3>
        </div>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="text-sm font-semibold text-primary transition hover:text-primary-dark"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-border bg-background px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

export default function ChildAccueilPage() {
  const { schoolSlug, childId } = useParams<{
    schoolSlug: string;
    childId: string;
  }>();

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="accueil"
      title="Accueil enfant"
      subtitle="Synthese quotidienne"
      summary="Vue generale de la journee scolaire de votre enfant."
      bullets={[
        "Resume des notes, messages, vie scolaire et emploi du temps.",
        "Acces rapide vers les modules de detail du menu enfant.",
        "Point d'entree synthétique plutot qu'un fil de contenu.",
      ]}
      hideModuleHeader
      hidePrimaryTabs
      hideSecondaryTabs
      content={({ child }) => (
        <ChildAccueilDashboard
          schoolSlug={schoolSlug}
          childId={childId}
          child={child}
        />
      )}
    />
  );
}
