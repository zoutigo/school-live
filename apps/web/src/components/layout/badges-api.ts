import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type BadgeScope = "NOTES" | "FEED" | "TICKETS" | "DISCIPLINE";

export type ChildBadgeSummary = {
  studentId: string;
  firstName: string;
  lastName: string;
  homeworkPending: number;
  notesUnread: number;
  disciplineUnread: number;
};

export type TeacherClassBadgeSummary = {
  classId: string;
  className: string;
  evaluationsToGrade: number;
};

export type UnreadSummary = {
  messagesUnread: number;
  feedUnread: number;
  ticketsNeedingResponse: number;
  ticketsUnreadReplies: number;
  children: ChildBadgeSummary[];
  teacherClasses: TeacherClassBadgeSummary[];
  total: number;
};

const CACHE_PREFIX = "scolive:badges:";

function cacheKey(schoolSlug: string) {
  return `${CACHE_PREFIX}${schoolSlug}`;
}

// Cameroon-specific reality: connectivity drops are frequent, so the last
// known summary is kept in localStorage and reused when a fetch fails,
// instead of collapsing badges back to zero while offline.
export function readCachedUnreadSummary(
  schoolSlug: string,
): UnreadSummary | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(cacheKey(schoolSlug));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as UnreadSummary;
  } catch {
    return null;
  }
}

function cacheUnreadSummary(schoolSlug: string, summary: UnreadSummary) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(cacheKey(schoolSlug), JSON.stringify(summary));
  } catch {
    // Storage can be unavailable (private mode, quota) — badges just won't
    // survive a reload while offline, which is an acceptable degradation.
  }
}

export async function getUnreadSummary(
  schoolSlug: string,
): Promise<UnreadSummary> {
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/me/unread-summary`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("UNREAD_SUMMARY_FETCH_FAILED");
  }
  const summary = (await response.json()) as UnreadSummary;
  cacheUnreadSummary(schoolSlug, summary);
  return summary;
}

export async function markBadgeRead(
  schoolSlug: string,
  scope: BadgeScope,
  scopeRefId?: string,
): Promise<void> {
  const csrfToken = getCsrfTokenCookie();
  if (!csrfToken) {
    throw new Error("CSRF_TOKEN_MISSING");
  }
  const response = await fetch(
    `${API_URL}/schools/${schoolSlug}/me/read-markers`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ scope, scopeRefId }),
    },
  );
  if (!response.ok) {
    throw new Error("MARK_BADGE_READ_FAILED");
  }
}
