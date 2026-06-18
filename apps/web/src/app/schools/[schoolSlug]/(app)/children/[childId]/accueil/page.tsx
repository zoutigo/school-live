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
import { lifeEventTypeLabel } from "../../../../../../../components/life-events/life-events-list";
import { useTranslation } from "../../../../../../../i18n/useTranslation";

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
  const { t } = useTranslation();
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
    : t("childAccueil.childFallback");

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-[24px] border border-primary/15 bg-[linear-gradient(145deg,rgba(10,98,191,0.14),rgba(255,255,255,0.98)_48%,rgba(28,154,138,0.14))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-surface/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              {t("childAccueil.badge")}
            </span>
            <div>
              <h2 className="font-heading text-2xl font-semibold text-text-primary">
                {studentLabel}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {child?.className
                  ? t("childAccueil.subtitleWithClass").replace(
                      "{className}",
                      child.className,
                    )
                  : t("childAccueil.subtitleDefault")}
              </p>
            </div>
            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              <SummaryStat
                label={t("childAccueil.stats.generalAverage")}
                value={formatScore(
                  latestSnapshot?.generalAverage.student ?? null,
                )}
                hint={latestSnapshot?.label ?? t("childAccueil.stats.noPeriod")}
                accent="primary"
              />
              <SummaryStat
                label={t("messaging.nav.unreadMessages")}
                value={`${unreadCount}`}
                hint={
                  latestMessage?.subject
                    ? `${t("messaging.nav.lastMessagePrefix")} : ${latestMessage.subject}`
                    : t("messaging.nav.noRecentMessageShort")
                }
                accent="teal"
              />
              <SummaryStat
                label={t("discipline.sidebar.vieScolaire")}
                value={`${events.length}`}
                hint={
                  unjustifiedCount > 0
                    ? t("discipline.accueil.summaryHint.unjustified").replace(
                        "{count}",
                        String(unjustifiedCount),
                      )
                    : sanctionsCount > 0
                      ? t("discipline.accueil.summaryHint.sanctions").replace(
                          "{count}",
                          String(sanctionsCount),
                        )
                      : t("discipline.accueil.summaryHint.none")
                }
                accent="gold"
              />
            </div>
          </div>

          <div className="rounded-[20px] border border-white/70 bg-white/80 p-4 shadow-[0_12px_28px_rgba(10,98,191,0.08)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
              <Clock3 className="h-4 w-4 text-primary" />
              {t("childAccueil.today")}
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-text-secondary">
                {t("common.loading")}
              </p>
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
                    ? t("childAccueil.room").replace(
                        "{room}",
                        nextOccurrence.room,
                      )
                    : t("childAccueil.roomTBC")}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-secondary">
                {t("childAccueil.noNextClass")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardPanel
              title={t("childAccueil.panel.grades.title")}
              icon={<BookOpen className="h-4 w-4" />}
              actionHref={`/schools/${schoolSlug}/children/${childId}/notes`}
              actionLabel={t("childAccueil.panel.grades.action")}
            >
              <div className="grid gap-3">
                <p className="text-sm text-text-secondary">
                  {latestSnapshot
                    ? t("childAccueil.panel.grades.period").replace(
                        "{label}",
                        latestSnapshot.label,
                      )
                    : t("childAccueil.panel.grades.empty")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricBadge
                    label={t("childAccueil.metric.average")}
                    value={formatScore(
                      latestSnapshot?.generalAverage.student ?? null,
                    )}
                  />
                  <MetricBadge
                    label={t("childAccueil.metric.bestSubject")}
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
              title={t("discipline.sidebar.vieScolaire")}
              icon={<ShieldAlert className="h-4 w-4" />}
              actionHref={`/schools/${schoolSlug}/children/${childId}/vie-scolaire`}
              actionLabel={t("discipline.accueil.panel.action")}
            >
              <div className="grid gap-3">
                <p className="text-sm text-text-secondary">
                  {latestEvent
                    ? `${lifeEventTypeLabel(t, latestEvent.type)} : ${latestEvent.reason}`
                    : t("discipline.accueil.panel.noRecentEvent")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricBadge
                    label={t("discipline.accueil.metrics.unjustifiedAbsences")}
                    value={`${unjustifiedCount}`}
                  />
                  <MetricBadge
                    label={t("discipline.accueil.metrics.sanctionsPunitions")}
                    value={`${sanctionsCount}`}
                  />
                </div>
              </div>
            </DashboardPanel>
          </div>

          <DashboardPanel
            title={t("childAccueil.panel.quickAccess.title")}
            icon={<CalendarDays className="h-4 w-4" />}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  label: t("childAccueil.quickLink.notes.label"),
                  hint: t("childAccueil.quickLink.notes.hint"),
                  href: `/schools/${schoolSlug}/children/${childId}/notes`,
                },
                {
                  label: t("discipline.sidebar.vieScolaire"),
                  hint: t("discipline.accueil.quickAccess.hint"),
                  href: `/schools/${schoolSlug}/children/${childId}/vie-scolaire`,
                },
                {
                  label: t("childAccueil.quickLink.classFeed.label"),
                  hint: t("childAccueil.quickLink.classFeed.hint"),
                  href: `/schools/${schoolSlug}/children/${childId}/vie-de-classe`,
                },
                {
                  label: t("childAccueil.quickLink.timetable.label"),
                  hint: t("childAccueil.quickLink.timetable.hint"),
                  href: `/schools/${schoolSlug}/emploi-du-temps?childId=${encodeURIComponent(
                    childId,
                  )}`,
                },
                {
                  label: t("messaging.nav.title"),
                  hint: t("messaging.nav.openMessagingHint"),
                  href: `/schools/${schoolSlug}/children/${childId}/messagerie`,
                },
                {
                  label: t("childAccueil.quickLink.homework.label"),
                  hint: t("childAccueil.quickLink.homework.hint"),
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
            title={t("messaging.nav.lastMessage")}
            icon={<MessageSquare className="h-4 w-4" />}
            actionHref={`/schools/${schoolSlug}/children/${childId}/messagerie`}
            actionLabel={t("messaging.nav.openLink")}
          >
            {latestMessage ? (
              <div className="grid gap-2">
                <p className="font-heading text-base font-semibold text-text-primary">
                  {latestMessage.subject}
                </p>
                <p className="text-sm text-text-secondary">
                  {latestMessage.preview?.trim() ||
                    t("messaging.nav.previewUnavailable")}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatDateLabel(latestMessage.createdAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                {t("messaging.nav.noRecentMessage")}
              </p>
            )}
          </DashboardPanel>

          <DashboardPanel
            title={t("childAccueil.panel.classFeed.title")}
            icon={<Users className="h-4 w-4" />}
            actionHref={`/schools/${schoolSlug}/children/${childId}/vie-de-classe`}
            actionLabel={t("childAccueil.panel.classFeed.action")}
          >
            <div className="grid gap-2 text-sm text-text-secondary">
              <p>{t("childAccueil.panel.classFeed.desc1")}</p>
              <p>
                {t("childAccueil.panel.classFeed.desc2")}{" "}
                <span className="font-semibold text-text-primary">
                  {t("childAccueil.panel.classFeed.title")}
                </span>
                .
              </p>
              <p>
                {child?.className
                  ? t("childAccueil.panel.classFeed.desc3WithClass").replace(
                      "{className}",
                      child.className,
                    )
                  : t("childAccueil.panel.classFeed.desc3Default")}
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
