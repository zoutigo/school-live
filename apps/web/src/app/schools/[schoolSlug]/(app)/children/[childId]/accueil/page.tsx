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
  ShoppingBag,
  Users,
} from "lucide-react";
import { ChildModulePage } from "../../../../../../../components/family/child-module-page";
import { lifeEventTypeLabel } from "../../../../../../../components/life-events/life-events-list";
import { useTranslation } from "../../../../../../../i18n/useTranslation";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { usePageHelp } from "../../../../../../../store/page-help";
import { OnboardingTarget } from "../../../../../../../components/onboarding/onboarding-target";
import {
  CHILD_HOME_TOUR_ID,
  CHILD_HOME_TOUR_STEPS,
  CHILD_HOME_TOUR_TARGETS,
} from "./child-home-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ChildContext = {
  id: string;
  firstName: string;
  lastName: string;
  classId?: string | null;
  className?: string | null;
};

type NotesEvaluation = {
  score: number | null;
  maxScore: number;
  recordedAt: string;
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
    evaluations: NotesEvaluation[];
  }>;
};

type FlatEvaluation = {
  subject: string;
  score: number | null;
  maxScore: number;
  recordedAt: string;
};

function extractLatestEvaluations(
  notes: NotesSnapshot[],
  count: number,
): FlatEvaluation[] {
  const all: FlatEvaluation[] = [];
  for (const snapshot of notes) {
    for (const subject of snapshot.subjects) {
      for (const ev of subject.evaluations ?? []) {
        all.push({
          subject: subject.subjectLabel,
          score: ev.score,
          maxScore: ev.maxScore,
          recordedAt: ev.recordedAt,
        });
      }
    }
  }
  return all
    .sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    )
    .slice(0, count);
}

type HomeworkRow = {
  id: string;
  myDoneAt?: string | null;
};

type FeedPostRow = {
  id: string;
  title: string;
  createdAt: string;
  author: { fullName: string };
};

function authorInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

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

type SupplyItemRow = {
  id: string;
  rank: number;
  label: string;
  quantity: number;
  note: string | null;
};

type ChildSupplyList = {
  targetSchoolYearId: string | null;
  targetSchoolYearLabel?: string;
  items: SupplyItemRow[];
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
  const [supplyList, setSupplyList] = useState<ChildSupplyList | null>(null);
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPostRow[]>([]);

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
          supplyListResponse,
          homeworkResponse,
          feedResponse,
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
            `${API_URL}/schools/${schoolSlug}/messages?folder=inbox&page=1&limit=20`,
            {
              credentials: "include",
            },
          ),
          fetch(
            `${API_URL}/schools/${schoolSlug}/me/supply-lists/students/${childId}`,
            {
              credentials: "include",
            },
          ),
          child?.classId
            ? fetch(
                `${API_URL}/schools/${schoolSlug}/classes/${child.classId}/homework?studentId=${encodeURIComponent(childId)}`,
                { credentials: "include" },
              )
            : Promise.resolve(null),
          fetch(
            `${API_URL}/schools/${schoolSlug}/feed?viewScope=GENERAL&limit=2`,
            { credentials: "include" },
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
          setSupplyList(
            supplyListResponse.ok
              ? ((await supplyListResponse.json()) as ChildSupplyList)
              : null,
          );
          if (homeworkResponse?.ok) {
            const homeworkPayload = await homeworkResponse.json();
            setHomework(Array.isArray(homeworkPayload) ? homeworkPayload : []);
          } else {
            setHomework([]);
          }
          if (feedResponse.ok) {
            const feedPayload = (await feedResponse.json()) as {
              items?: FeedPostRow[];
            };
            setFeedPosts(
              Array.isArray(feedPayload.items) ? feedPayload.items : [],
            );
          } else {
            setFeedPosts([]);
          }
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
  }, [childId, schoolSlug, child?.classId]);

  const latestSnapshot = notes[0] ?? null;
  const undoneHomework = useMemo(
    () => homework.filter((hw) => !hw.myDoneAt).length,
    [homework],
  );
  const latestEvaluations = useMemo(
    () => extractLatestEvaluations(notes, 3),
    [notes],
  );
  const unreadMessages = useMemo(
    () => messages.filter((m) => m.unread).slice(0, 3),
    [messages],
  );
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

  usePageHelp({
    title: t("childAccueil.help.title"),
    sections: [
      {
        title: t("childAccueil.help.section1Title"),
        body: [t("childAccueil.help.section1Body")],
      },
      {
        title: t("childAccueil.help.section2Title"),
        body: [t("childAccueil.help.section2Body")],
      },
      {
        title: t("childAccueil.help.section3Title"),
        body: [t("childAccueil.help.section3Body")],
      },
    ],
  });

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
            <OnboardingTarget
              id={CHILD_HOME_TOUR_TARGETS.kpis}
              className="grid gap-3 pt-2 sm:grid-cols-3"
            >
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
                  unreadMessages[0]?.subject
                    ? `${t("messaging.nav.lastMessagePrefix")} : ${unreadMessages[0].subject}`
                    : t("messaging.nav.noRecentMessageShort")
                }
                accent="teal"
              />
              <SummaryStat
                label={t("childAccueil.stats.homework")}
                value={child?.classId ? `${undoneHomework}` : "–"}
                hint={
                  child?.classId
                    ? t("childAccueil.stats.homeworkNotDone")
                    : t("childAccueil.stats.unknownClass")
                }
                accent="gold"
              />
            </OnboardingTarget>
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

      <OnboardingTarget
        id={CHILD_HOME_TOUR_TARGETS.sections}
        className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]"
      >
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
                <div
                  className="grid gap-1"
                  data-testid="child-accueil-latest-evaluations"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {t("childAccueil.panel.grades.latestTitle")}
                  </p>
                  {latestEvaluations.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      {t("childAccueil.panel.grades.latestEmpty")}
                    </p>
                  ) : (
                    <ul className="grid gap-1">
                      {latestEvaluations.map((ev, idx) => (
                        <li
                          key={`${ev.subject}-${ev.recordedAt}-${idx}`}
                          data-testid={`child-accueil-eval-row-${idx}`}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-text-primary">
                            {ev.subject}
                          </span>
                          <span className="font-medium text-text-primary">
                            {ev.score !== null ? formatScore(ev.score) : "–"}/
                            {formatScore(ev.maxScore)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel
              title={t("discipline.sidebar.discipline")}
              icon={<ShieldAlert className="h-4 w-4" />}
              actionHref={`/schools/${schoolSlug}/children/${childId}/discipline`}
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
                  label: t("discipline.sidebar.discipline"),
                  hint: t("discipline.accueil.quickAccess.hint"),
                  href: `/schools/${schoolSlug}/children/${childId}/discipline`,
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
            title={t("childAccueil.panel.unreadMessages.title")}
            icon={<MessageSquare className="h-4 w-4" />}
            actionHref={`/schools/${schoolSlug}/children/${childId}/messagerie`}
            actionLabel={t("messaging.nav.openLink")}
          >
            {unreadMessages.length === 0 ? (
              <p
                className="text-sm text-text-secondary"
                data-testid="child-accueil-unread-empty"
              >
                {t("childAccueil.panel.unreadMessages.empty")}
              </p>
            ) : (
              <ul
                className="grid gap-2"
                data-testid="child-accueil-unread-list"
              >
                {unreadMessages.map((msg, idx) => (
                  <li
                    key={msg.id}
                    data-testid={`child-accueil-unread-row-${idx}`}
                    className="grid gap-0.5"
                  >
                    <p className="text-sm font-semibold text-text-primary">
                      {msg.subject}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {msg.sender
                        ? `${msg.sender.firstName} ${msg.sender.lastName}`
                        : t("childAccueil.panel.unreadMessages.unknownSender")}
                      {" · "}
                      {formatDateLabel(msg.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>

          {supplyList && supplyList.targetSchoolYearId ? (
            <DashboardPanel
              title={t("childAccueil.panel.supplies.title")}
              icon={<ShoppingBag className="h-4 w-4" />}
              actionHref={`/schools/${schoolSlug}/reinscription`}
              actionLabel={t("childAccueil.panel.supplies.action")}
            >
              <div
                className="grid gap-2 text-sm text-text-secondary"
                data-testid="child-home-supplies-panel"
              >
                {supplyList.items.length === 0 ? (
                  <p>{t("childAccueil.panel.supplies.empty")}</p>
                ) : (
                  supplyList.items
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .slice(0, 3)
                    .map((item) => (
                      <p key={item.id}>
                        {item.rank}. {item.label} — x{item.quantity}
                      </p>
                    ))
                )}
              </div>
            </DashboardPanel>
          ) : null}

          <DashboardPanel
            title={t("childAccueil.panel.classFeed.title")}
            icon={<Users className="h-4 w-4" />}
            actionHref={`/schools/${schoolSlug}/children/${childId}/vie-de-classe`}
            actionLabel={t("childAccueil.panel.classFeed.action")}
          >
            {feedPosts.length === 0 ? (
              <p
                className="text-sm text-text-secondary"
                data-testid="child-accueil-feed-empty"
              >
                {t("childAccueil.panel.classFeed.empty")}
              </p>
            ) : (
              <ul className="grid gap-2" data-testid="child-accueil-feed-list">
                {feedPosts.map((post, idx) => (
                  <li
                    key={post.id}
                    data-testid={`child-accueil-feed-row-${idx}`}
                    className="grid gap-0.5"
                  >
                    <p className="text-sm font-semibold text-text-primary">
                      {post.title}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {authorInitials(post.author.fullName)}
                      {" · "}
                      {formatDateLabel(post.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>
        </div>
      </OnboardingTarget>
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
        "Resume des notes, messages, discipline et emploi du temps.",
        "Acces rapide vers les modules de detail du menu enfant.",
        "Point d'entree synthétique plutot qu'un fil de contenu.",
      ]}
      hideModuleHeader
      hidePrimaryTabs
      hideSecondaryTabs
      onReady={({ onboardingHelpEnabled }) => {
        const tourStore = useOnboardingTourStore.getState();
        if (
          onboardingHelpEnabled &&
          !tourStore.isCompleted("parent", CHILD_HOME_TOUR_ID) &&
          !tourStore.activeTourId
        ) {
          tourStore.startTour(
            CHILD_HOME_TOUR_ID,
            "parent",
            CHILD_HOME_TOUR_STEPS,
          );
        }
      }}
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
