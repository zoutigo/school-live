"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  Calendar,
  ChevronLeft,
  Heart,
  Key,
  LogIn,
  MessageSquare,
  PenLine,
  Search,
  Shield,
  UserCircle2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useTranslation } from "../../../../../i18n/useTranslation";
import { getCsrfTokenCookie } from "../../../../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type ActivationStatus = "PENDING" | "ACTIVE" | "SUSPENDED";
type RoleFilter = "ALL" | SchoolRole;

type SchoolUserItem = {
  id: string;
  studentId: string | null;
  hasAccount: true;
  type: "user";
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: "M" | "F" | "OTHER" | null;
  roles: SchoolRole[];
  activationStatus: ActivationStatus;
  profileCompleted: boolean;
  createdAt: string;
};

type StudentOnlyItem = {
  id: string;
  studentId: string;
  hasAccount: false;
  type: "student-only";
  firstName: string;
  lastName: string;
  email: null;
  phone: null;
  roles: ["STUDENT"];
  activationStatus: null;
  profileCompleted: false;
  createdAt: string;
};

type SchoolMember = SchoolUserItem | StudentOnlyItem;

type SchoolUserDetail = SchoolUserItem & {
  lastLoginAt: string | null;
  updatedAt: string;
  enrollments: {
    id: string;
    classId: string;
    className: string;
    schoolYear: string;
  }[];
  children: {
    id: string;
    firstName: string;
    lastName: string;
    className?: string | null;
  }[];
  teachingClasses: {
    classId: string;
    className: string;
    subjects: { id: string; name: string }[];
  }[];
  studentParents: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  }[];
  staffFunctions: { id: string; name: string }[];
};

type StudentOnlyDetail = {
  type: "student-only";
  studentId: string;
  firstName: string;
  lastName: string;
  enrollments: {
    id: string;
    classId: string;
    className: string;
    schoolYear: string;
  }[];
  studentParents: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  }[];
};

type AdminStudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  currentEnrollment: {
    id: string;
    class: { id: string; name: string };
    schoolYear: { id: string; label: string };
  } | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<
  SchoolRole,
  { bg: string; text: string; border: string }
> = {
  TEACHER: { bg: "#E8F5F3", text: "#247C72", border: "#247C72" },
  PARENT: { bg: "#FDF3E7", text: "#D89B5B", border: "#D89B5B" },
  STUDENT: { bg: "#FEF0EB", text: "#B85C2E", border: "#B85C2E" },
  SCHOOL_STAFF: { bg: "#F0EFED", text: "#5F5A52", border: "#5F5A52" },
  SCHOOL_ADMIN: { bg: "#E8EFF6", text: "#08467D", border: "#08467D" },
  SCHOOL_MANAGER: { bg: "#E8F2F1", text: "#195E56", border: "#195E56" },
  SUPERVISOR: { bg: "#F3EDF8", text: "#7B4EA0", border: "#7B4EA0" },
  SCHOOL_ACCOUNTANT: { bg: "#EAF5F0", text: "#2E7D62", border: "#2E7D62" },
};

const STATUS_COLORS: Record<ActivationStatus, { tKey: string; cls: string }> = {
  ACTIVE: {
    tKey: "users.status.active",
    cls: "text-teal-700 bg-teal-50 border border-teal-200",
  },
  PENDING: {
    tKey: "users.status.pending",
    cls: "text-amber-700 bg-amber-50 border border-amber-200",
  },
  SUSPENDED: {
    tKey: "users.status.suspended",
    cls: "text-red-700 bg-red-50 border border-red-200",
  },
};

const ROLE_FILTER_KEYS: { value: RoleFilter; tKey: string }[] = [
  { value: "ALL", tKey: "users.filter.all" },
  { value: "TEACHER", tKey: "users.filter.teachers" },
  { value: "PARENT", tKey: "users.filter.parents" },
  { value: "STUDENT", tKey: "users.filter.students" },
  { value: "SCHOOL_ADMIN", tKey: "users.filter.admins" },
  { value: "SCHOOL_MANAGER", tKey: "users.filter.managers" },
  { value: "SCHOOL_STAFF", tKey: "users.filter.staff" },
];

const ALL_ROLES: SchoolRole[] = [
  "TEACHER",
  "PARENT",
  "STUDENT",
  "SCHOOL_STAFF",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
];

const ROLE_TRANSLATION_KEYS: Record<SchoolRole, string> = {
  TEACHER: "users.roles.teacher",
  PARENT: "users.roles.parent",
  STUDENT: "users.roles.student",
  SCHOOL_STAFF: "users.roles.staff",
  SCHOOL_ADMIN: "users.roles.admin",
  SCHOOL_MANAGER: "users.roles.manager",
  SUPERVISOR: "users.roles.supervisor",
  SCHOOL_ACCOUNTANT: "users.roles.accountant",
};

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(body.message)
      ? body.message.join(", ")
      : (body.message ?? "Erreur");
    throw new Error(msg);
  }
  return resp.json() as Promise<T>;
}

function extractError(err: unknown): string {
  return err instanceof Error ? err.message : "Erreur inconnue";
}

// ── Small UI atoms ────────────────────────────────────────────────────────────

function RoleBadge({
  role,
  t,
}: {
  role: SchoolRole;
  t: (k: string) => string;
}) {
  const c = ROLE_COLORS[role];
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {t(ROLE_TRANSLATION_KEYS[role])}
    </span>
  );
}

function StatusChip({
  status,
  t,
}: {
  status: ActivationStatus;
  t: (k: string) => string;
}) {
  const s = STATUS_COLORS[status];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}
    >
      {t(s.tKey)}
    </span>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  onClick,
  disabled = false,
  "data-testid": testId,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  "data-testid"?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        color,
        borderColor: `${color}50`,
        backgroundColor: `${color}10`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-warm-border/50 py-2.5 last:border-0">
      <span className="w-40 shrink-0 text-xs text-text-secondary">{label}</span>
      <span className="text-sm text-text-primary">{value || "—"}</span>
    </div>
  );
}

function SectionCard({
  color,
  icon,
  title,
  children,
}: {
  color: { bg: string; border: string; text: string };
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: color.bg, borderColor: `${color.border}50` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: color.text }}>{icon}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: color.text }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      data-testid={`toast-${type}`}
      className={`fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold shadow-2xl ${type === "success" ? "bg-teal-700 text-white" : "bg-red-600 text-white"}`}
    >
      {message}
      <button
        type="button"
        onClick={onClose}
        className="ml-1 rounded p-0.5 text-white/70 hover:text-white"
      >
        <X size={15} />
      </button>
    </div>
  );
}

// ── Shared Modal primitives ───────────────────────────────────────────────────

function ModalOverlay({
  onClose,
  testId,
  children,
}: {
  onClose: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-[#2f2418]/40 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        data-testid={testId}
        className="relative w-full max-w-md rounded-[22px] border border-warm-border bg-[linear-gradient(160deg,#fffcfa_0%,#fff8f0_100%)] p-6 shadow-[0_24px_60px_rgba(47,36,24,0.2)]"
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  eyebrow,
  title,
  subtitle,
  onClose,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-2">
      <div>
        <span className="mb-2 inline-flex rounded-full border border-[#efcfaa] bg-[#fff3e4] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b7793a]">
          {eyebrow}
        </span>
        <h2 className="font-heading text-lg font-bold leading-snug text-text-primary">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-warm-highlight hover:text-text-primary"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function ModalSearchInput({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  testId?: string;
}) {
  return (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
      />
      <input
        data-testid={testId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="w-full rounded-xl border border-warm-border bg-white py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/60"
      />
    </div>
  );
}

function ModalActions({
  onCancel,
  onSubmit,
  submitLabel,
  submitDisabled,
  submitting,
  testId,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  testId?: string;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2.5">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        data-testid={testId ? `${testId}-cancel` : undefined}
        className="rounded-xl border border-warm-border px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-warm-highlight disabled:opacity-50"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitDisabled ?? submitting}
        data-testid={testId ? `${testId}-submit` : undefined}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Enregistrement…" : submitLabel}
      </button>
    </div>
  );
}

// ── AssignParentToStudentModal ─────────────────────────────────────────────────

function AssignParentToStudentModal({
  schoolSlug,
  studentId,
  onClose,
  onSuccess,
  t,
}: {
  schoolSlug: string;
  studentId: string;
  onClose: () => void;
  onSuccess: () => void;
  t: (k: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [parents, setParents] = useState<SchoolUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SchoolUserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (search: string) => {
      setLoading(true);
      try {
        const q = new URLSearchParams({
          search,
          role: "PARENT",
          page: "1",
          limit: "20",
        });
        const res = await apiFetch<{ data: SchoolMember[] }>(
          `/schools/${schoolSlug}/users?${q.toString()}`,
        );
        setParents(
          (res.data ?? []).filter((u): u is SchoolUserItem => u.hasAccount),
        );
      } catch {
        setParents([]);
      } finally {
        setLoading(false);
      }
    },
    [schoolSlug],
  );

  useEffect(() => {
    void load("");
  }, [load]);
  useEffect(() => {
    const timer = setTimeout(() => void load(query), 300);
    return () => clearTimeout(timer);
  }, [query, load]);

  async function handleSubmit() {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    const csrf = getCsrfTokenCookie();
    try {
      await apiFetch(`/schools/${schoolSlug}/admin/parent-students`, {
        method: "POST",
        headers: { "X-CSRF-Token": csrf ?? "" },
        body: JSON.stringify({ studentId, parentUserId: selected.id }),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose} testId="assign-parent-modal">
      <ModalHeader
        eyebrow={t("users.assignParent.eyebrow")}
        title={t("users.assignParent.title")}
        subtitle={t("users.assignParent.subtitle")}
        onClose={onClose}
      />
      <ModalSearchInput
        value={query}
        onChange={setQuery}
        placeholder={t("users.assignParent.search")}
        testId="assign-parent-search"
      />
      <div
        className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1"
        data-testid="assign-parent-list"
      >
        {loading ? (
          <p className="py-4 text-center text-sm text-text-secondary">
            Chargement…
          </p>
        ) : parents.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">
            {t("users.assignParent.noResult")}
          </p>
        ) : (
          parents.map((p) => {
            const isSelected = selected?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                data-testid={`assign-parent-user-${p.id}`}
                onClick={() => setSelected(isSelected ? null : p)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${isSelected ? "border-primary bg-blue-50" : "border-warm-border bg-warm-surface hover:bg-warm-highlight"}`}
              >
                <p
                  className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-text-primary"}`}
                >
                  {p.lastName} {p.firstName}
                </p>
                {p.phone ? (
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {p.phone}
                  </p>
                ) : p.email ? (
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {p.email}
                  </p>
                ) : null}
              </button>
            );
          })
        )}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <ModalActions
        onCancel={onClose}
        onSubmit={() => void handleSubmit()}
        submitLabel={t("users.assignParent.submit")}
        submitDisabled={!selected}
        submitting={submitting}
        testId="assign-parent"
      />
    </ModalOverlay>
  );
}

// ── AssignChildToParentModal ──────────────────────────────────────────────────

function AssignChildToParentModal({
  schoolSlug,
  parentUserId,
  onClose,
  onSuccess,
  t,
}: {
  schoolSlug: string;
  parentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
  t: (k: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AdminStudentRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (search: string) => {
      setLoading(true);
      try {
        const q = new URLSearchParams({ search, page: "1", limit: "20" });
        const res = await apiFetch<{ students: AdminStudentRow[] }>(
          `/schools/${schoolSlug}/admin/students?${q.toString()}`,
        );
        setStudents(res.students ?? []);
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    },
    [schoolSlug],
  );

  useEffect(() => {
    void load("");
  }, [load]);
  useEffect(() => {
    const timer = setTimeout(() => void load(query), 300);
    return () => clearTimeout(timer);
  }, [query, load]);

  async function handleSubmit() {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    const csrf = getCsrfTokenCookie();
    try {
      await apiFetch(`/schools/${schoolSlug}/admin/parent-students`, {
        method: "POST",
        headers: { "X-CSRF-Token": csrf ?? "" },
        body: JSON.stringify({ studentId: selected.id, parentUserId }),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose} testId="assign-child-modal">
      <ModalHeader
        eyebrow={t("users.assignChild.eyebrow")}
        title={t("users.assignChild.title")}
        subtitle={t("users.assignChild.subtitle")}
        onClose={onClose}
      />
      <ModalSearchInput
        value={query}
        onChange={setQuery}
        placeholder={t("users.assignChild.search")}
        testId="assign-child-search"
      />
      <div
        className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1"
        data-testid="assign-child-list"
      >
        {loading ? (
          <p className="py-4 text-center text-sm text-text-secondary">
            Chargement…
          </p>
        ) : students.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">
            {t("users.assignChild.noResult")}
          </p>
        ) : (
          students.map((s) => {
            const isSelected = selected?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                data-testid={`assign-child-student-${s.id}`}
                onClick={() => setSelected(isSelected ? null : s)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${isSelected ? "border-primary bg-blue-50" : "border-warm-border bg-warm-surface hover:bg-warm-highlight"}`}
              >
                <p
                  className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-text-primary"}`}
                >
                  {s.lastName} {s.firstName}
                </p>
                {s.currentEnrollment ? (
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {s.currentEnrollment.class.name} ·{" "}
                    {s.currentEnrollment.schoolYear.label}
                  </p>
                ) : null}
              </button>
            );
          })
        )}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <ModalActions
        onCancel={onClose}
        onSubmit={() => void handleSubmit()}
        submitLabel={t("users.assignChild.submit")}
        submitDisabled={!selected}
        submitting={submitting}
        testId="assign-child"
      />
    </ModalOverlay>
  );
}

// ── EditRolesModal ────────────────────────────────────────────────────────────

function EditRolesModal({
  schoolSlug,
  userId,
  currentRoles,
  onClose,
  onSuccess,
  t,
}: {
  schoolSlug: string;
  userId: string;
  currentRoles: SchoolRole[];
  onClose: () => void;
  onSuccess: () => void;
  t: (k: string) => string;
}) {
  const [roles, setRoles] = useState<SchoolRole[]>(currentRoles);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(role: SchoolRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function handleSubmit() {
    if (roles.length === 0) {
      setError(t("users.editRoles.minOneRole"));
      return;
    }
    setError(null);
    setSubmitting(true);
    const csrf = getCsrfTokenCookie();
    try {
      await apiFetch(`/schools/${schoolSlug}/users/${userId}/roles`, {
        method: "PATCH",
        headers: { "X-CSRF-Token": csrf ?? "" },
        body: JSON.stringify({ roles }),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose} testId="edit-roles-modal">
      <ModalHeader
        eyebrow={t("users.editRoles.eyebrow")}
        title={t("users.editRoles.title")}
        subtitle={t("users.editRoles.subtitle")}
        onClose={onClose}
      />
      <div className="space-y-1.5" data-testid="edit-roles-list">
        {ALL_ROLES.map((role) => {
          const c = ROLE_COLORS[role];
          const checked = roles.includes(role);
          return (
            <label
              key={role}
              data-testid={`role-check-${role.toLowerCase()}`}
              className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors"
              style={
                checked
                  ? { backgroundColor: c.bg, borderColor: `${c.border}80` }
                  : { borderColor: "#e8d5c0", backgroundColor: "#faf7f4" }
              }
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold text-white transition-colors"
                style={
                  checked
                    ? { backgroundColor: c.border, borderColor: c.border }
                    : {
                        backgroundColor: "white",
                        borderColor: "#c8b89e",
                        color: "transparent",
                      }
                }
              >
                {checked ? "✓" : ""}
              </span>
              <span
                className="flex-1 text-sm font-semibold"
                style={{ color: checked ? c.text : "#5a5048" }}
              >
                {t(ROLE_TRANSLATION_KEYS[role])}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggle(role)}
              />
            </label>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <ModalActions
        onCancel={onClose}
        onSubmit={() => void handleSubmit()}
        submitLabel={t("users.editRoles.submit")}
        submitDisabled={roles.length === 0}
        submitting={submitting}
        testId="edit-roles"
      />
    </ModalOverlay>
  );
}

// ── Role sections ─────────────────────────────────────────────────────────────

function TeacherRoleSection({
  classes,
  t,
}: {
  classes: SchoolUserDetail["teachingClasses"];
  t: (k: string) => string;
}) {
  const c = ROLE_COLORS.TEACHER;
  return (
    <SectionCard
      color={c}
      icon={<BookOpen size={14} />}
      title={t("users.roles.teacher")}
    >
      {classes.length === 0 ? (
        <p className="text-sm italic text-text-secondary">
          {t("users.roles.noClass")}
        </p>
      ) : (
        <div className="space-y-2">
          {classes.map((cls) => (
            <div
              key={cls.classId}
              className="flex flex-wrap items-center gap-2"
            >
              <span
                className="rounded border px-2 py-0.5 text-xs font-bold"
                style={{
                  borderColor: `${c.border}60`,
                  color: c.text,
                  backgroundColor: "#fff",
                }}
              >
                {cls.className}
              </span>
              {cls.subjects.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: c.border }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ParentRoleSection({
  children,
  onAssignChildClick,
  t,
}: {
  children: SchoolUserDetail["children"];
  onAssignChildClick: () => void;
  t: (k: string) => string;
}) {
  const c = ROLE_COLORS.PARENT;
  return (
    <SectionCard
      color={c}
      icon={<Heart size={14} />}
      title={t("users.roles.parent")}
    >
      {children.length === 0 ? (
        <p className="mb-3 text-sm italic text-text-secondary">
          {t("users.roles.noChildren")}
        </p>
      ) : (
        <div className="mb-3 space-y-1.5">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-2"
              data-testid={`parent-child-${child.id}`}
            >
              <span className="text-sm font-semibold text-text-primary">
                {child.lastName} {child.firstName}
              </span>
              {child.className ? (
                <span
                  className="rounded border px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ borderColor: `${c.border}60`, color: c.text }}
                >
                  {child.className}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <div className="border-t pt-3" style={{ borderColor: `${c.border}25` }}>
        <ActionBtn
          icon={<UserPlus size={12} />}
          label={t("users.actions.assignChild")}
          color={c.text}
          data-testid="action-assign-child"
          onClick={onAssignChildClick}
        />
      </div>
    </SectionCard>
  );
}

function StudentRoleSection({
  enrollments,
  parents,
  hasAccount,
  onDisciplineClick,
  onAssignParentClick,
  onCreateAccessClick,
  onResetPasswordClick,
  t,
}: {
  enrollments: {
    id: string;
    classId: string;
    className: string;
    schoolYear: string;
  }[];
  parents: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  }[];
  hasAccount: boolean;
  onDisciplineClick: () => void;
  onAssignParentClick: () => void;
  onCreateAccessClick: () => void;
  onResetPasswordClick: () => void;
  t: (k: string) => string;
}) {
  const c = ROLE_COLORS.STUDENT;
  return (
    <SectionCard
      color={c}
      icon={<BookOpen size={14} />}
      title={t("users.roles.student")}
    >
      {enrollments.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">
            {enrollments[0].className}
          </span>
          <span className="text-xs" style={{ color: c.text }}>
            {enrollments[0].schoolYear}
          </span>
        </div>
      ) : (
        <p className="mb-2 text-sm italic text-text-secondary">
          {t("users.roles.noEnrollment")}
        </p>
      )}

      {parents.length > 0 ? (
        <div
          className="mb-3 space-y-1.5 border-t pt-2"
          style={{ borderColor: `${c.border}25` }}
          data-testid="student-parents"
        >
          <p
            className="mb-1 text-[10px] font-bold uppercase tracking-[0.13em]"
            style={{ color: c.text }}
          >
            {t("users.roles.parents")}
          </p>
          {parents.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2"
              data-testid={`student-parent-${p.id}`}
            >
              <UserCircle2 size={13} style={{ color: c.border }} />
              <span className="text-sm font-semibold text-text-primary">
                {p.lastName} {p.firstName}
              </span>
              {p.phone ? (
                <span className="text-xs text-text-secondary">{p.phone}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div
        className="flex flex-wrap gap-2 border-t pt-3"
        style={{ borderColor: `${c.border}25` }}
        data-testid="student-actions"
      >
        <ActionBtn
          icon={<Calendar size={12} />}
          label={t("users.actions.discipline")}
          color={c.text}
          data-testid="action-student-discipline"
          onClick={onDisciplineClick}
        />
        <ActionBtn
          icon={<UserCircle2 size={12} />}
          label={t("users.actions.assignParent")}
          color="#D89B5B"
          data-testid="action-assign-parent"
          onClick={onAssignParentClick}
        />
        {!hasAccount ? (
          <ActionBtn
            icon={<LogIn size={12} />}
            label={t("users.actions.createAccess")}
            color="#195E56"
            data-testid="action-create-access"
            onClick={onCreateAccessClick}
          />
        ) : (
          <ActionBtn
            icon={<Key size={12} />}
            label={t("users.actions.resetPassword")}
            color="#7B4EA0"
            data-testid="action-reset-password"
            onClick={onResetPasswordClick}
          />
        )}
      </div>
    </SectionCard>
  );
}

function StaffRoleSection({
  functions,
  t,
}: {
  functions: { id: string; name: string }[];
  t: (k: string) => string;
}) {
  const c = ROLE_COLORS.SCHOOL_STAFF;
  return (
    <SectionCard
      color={c}
      icon={<Briefcase size={14} />}
      title={t("users.roles.staff")}
    >
      {functions.length === 0 ? (
        <p className="text-sm italic text-text-secondary">
          {t("users.roles.noFunction")}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {functions.map((fn) => (
            <span
              key={fn.id}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: c.border }}
            >
              {fn.name}
            </span>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function AdminRoleSection({
  role,
  t,
}: {
  role: SchoolRole;
  t: (k: string) => string;
}) {
  const c = ROLE_COLORS[role];
  const iconMap: Partial<Record<SchoolRole, React.ReactNode>> = {
    SCHOOL_ADMIN: <Shield size={14} />,
    SCHOOL_MANAGER: <Users size={14} />,
    SUPERVISOR: <Search size={14} />,
    SCHOOL_ACCOUNTANT: <PenLine size={14} />,
  };
  return (
    <SectionCard
      color={c}
      icon={iconMap[role] ?? <Shield size={14} />}
      title={t(ROLE_TRANSLATION_KEYS[role])}
    >
      <p className="text-sm italic text-text-secondary">
        {t("users.roles.adminRole")}
      </p>
    </SectionCard>
  );
}

// ── UserDetailPanel ───────────────────────────────────────────────────────────

function UserDetailPanel({
  member,
  schoolSlug,
  onClose,
  onRefreshList,
  onShowToast,
  t,
}: {
  member: SchoolMember;
  schoolSlug: string;
  onClose: () => void;
  onRefreshList: () => void;
  onShowToast: (msg: string, type: "success" | "error") => void;
  t: (k: string) => string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<
    SchoolUserDetail | StudentOnlyDetail | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [assignChildOpen, setAssignChildOpen] = useState(false);
  const [assignParentOpen, setAssignParentOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (member.type === "student-only") {
        const data = await apiFetch<StudentOnlyDetail>(
          `/schools/${schoolSlug}/students/${member.studentId}/profile`,
        );
        setDetail({
          ...data,
          enrollments: data.enrollments ?? [],
          studentParents: data.studentParents ?? [],
        });
      } else {
        const data = await apiFetch<SchoolUserDetail>(
          `/schools/${schoolSlug}/users/${member.id}`,
        );
        setDetail(data);
      }
    } catch {
      setError(t("users.detail.error"));
    } finally {
      setLoading(false);
    }
  }, [member, schoolSlug, t]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const fullName = `${member.lastName} ${member.firstName}`.trim();
  const studentId =
    member.type === "student-only"
      ? member.studentId
      : (member.studentId ?? member.id);

  const studentParents =
    detail && "studentParents" in detail ? detail.studentParents : [];

  const studentSectionProps = {
    enrollments: detail && "enrollments" in detail ? detail.enrollments : [],
    parents: studentParents,
    onDisciplineClick: () => {
      const sid = member.type === "student-only" ? member.studentId : member.id;
      void router.push(`/schools/${schoolSlug}/discipline/${sid}`);
    },
    onAssignParentClick: () => setAssignParentOpen(true),
    onCreateAccessClick: async () => {
      const csrf = getCsrfTokenCookie();
      try {
        await apiFetch(
          `/schools/${schoolSlug}/admin/students/${studentId}/create-account`,
          {
            method: "POST",
            headers: { "X-CSRF-Token": csrf ?? "" },
          },
        );
        await loadDetail();
        onRefreshList();
        onShowToast(t("users.promote.success"), "success");
      } catch (err) {
        onShowToast(extractError(err), "error");
      }
    },
    onResetPasswordClick: async () => {
      if (member.type !== "user") return;
      const csrf = getCsrfTokenCookie();
      try {
        await apiFetch(
          `/schools/${schoolSlug}/admin/users/${member.id}/reset-password`,
          {
            method: "POST",
            headers: { "X-CSRF-Token": csrf ?? "" },
          },
        );
        onShowToast(t("users.resetPwd.success"), "success");
      } catch (err) {
        onShowToast(extractError(err), "error");
      }
    },
    t,
  };

  function renderRoleSections() {
    if (!detail) return null;
    if (member.type === "student-only") {
      return <StudentRoleSection {...studentSectionProps} hasAccount={false} />;
    }
    const d = detail as SchoolUserDetail;
    return member.roles.map((role) => {
      if (role === "TEACHER")
        return (
          <TeacherRoleSection
            key={role}
            classes={d.teachingClasses ?? []}
            t={t}
          />
        );
      if (role === "PARENT")
        return (
          <ParentRoleSection
            key={role}
            children={d.children ?? []}
            onAssignChildClick={() => setAssignChildOpen(true)}
            t={t}
          />
        );
      if (role === "STUDENT")
        return (
          <StudentRoleSection
            key={role}
            {...studentSectionProps}
            enrollments={d.enrollments ?? []}
            parents={d.studentParents ?? []}
            hasAccount={true}
          />
        );
      if (role === "SCHOOL_STAFF")
        return (
          <StaffRoleSection
            key={role}
            functions={d.staffFunctions ?? []}
            t={t}
          />
        );
      return <AdminRoleSection key={role} role={role} t={t} />;
    });
  }

  const genderKey =
    member.type === "user" && member.gender
      ? `users.gender.${member.gender}`
      : null;

  return (
    <>
      <div
        className="flex h-full flex-col overflow-hidden"
        data-testid="user-detail-panel"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-warm-border bg-warm-surface px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            data-testid="user-detail-close"
            className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-warm-highlight hover:text-text-primary"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-text-secondary">
              {t("users.detail.title")}
            </p>
            <p
              className="truncate font-bold text-text-primary"
              data-testid="user-detail-name"
            >
              {fullName}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {member.roles.map((r) => (
              <RoleBadge key={r} role={r as SchoolRole} t={t} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto p-5 space-y-4"
          data-testid="user-detail-body"
        >
          {/* Profile banner */}
          <div
            className="rounded-2xl border border-warm-border bg-white p-4"
            data-testid="user-detail-profile"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p
                className="text-base font-bold text-text-primary"
                data-testid="user-detail-fullname"
              >
                {fullName}
              </p>
              {member.hasAccount && member.activationStatus ? (
                <StatusChip status={member.activationStatus} t={t} />
              ) : (
                <span className="rounded-full bg-warm-surface px-2 py-0.5 text-[11px] text-text-secondary">
                  {t("users.noAccount")}
                </span>
              )}
            </div>

            {member.hasAccount ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-warm-border pt-3">
                <ActionBtn
                  icon={<MessageSquare size={12} />}
                  label={t("users.actions.message")}
                  color="#08467D"
                  data-testid="action-send-message"
                  onClick={() => {
                    void router.push(
                      `/schools/${schoolSlug}/messagerie/nouveau?recipientId=${member.id}&recipientName=${encodeURIComponent(fullName)}`,
                    );
                    onClose();
                  }}
                />
                <ActionBtn
                  icon={<Shield size={12} />}
                  label={t("users.actions.editRoles")}
                  color="#08467D"
                  data-testid="action-edit-roles"
                  onClick={() => setEditRolesOpen(true)}
                />
              </div>
            ) : null}
          </div>

          {/* Role sections */}
          {loading ? (
            <p
              className="py-8 text-center text-sm text-text-secondary"
              data-testid="user-detail-loading"
            >
              {t("users.detail.loadingProfile")}
            </p>
          ) : error ? (
            <div
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              data-testid="user-detail-error"
            >
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => void loadDetail()}
                className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold text-red-700 underline hover:no-underline"
              >
                {t("users.detail.retry")}
              </button>
            </div>
          ) : (
            <div className="space-y-3" data-testid="user-detail-role-sections">
              {renderRoleSections()}
            </div>
          )}

          {/* Contact */}
          {member.hasAccount ? (
            <div
              className="overflow-hidden rounded-2xl border border-warm-border bg-white"
              data-testid="user-detail-contact"
            >
              <div className="border-b border-warm-border bg-warm-surface px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  {t("users.detail.contact")}
                </p>
              </div>
              <div className="px-4">
                <InfoRow
                  label={t("users.detail.email")}
                  value={member.email ?? ""}
                />
                <InfoRow
                  label={t("users.detail.phone")}
                  value={member.phone ?? ""}
                />
                {genderKey ? (
                  <InfoRow
                    label={t("users.detail.gender")}
                    value={t(genderKey)}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Activity */}
          {member.hasAccount ? (
            <div
              className="overflow-hidden rounded-2xl border border-warm-border bg-white"
              data-testid="user-detail-activity"
            >
              <div className="border-b border-warm-border bg-warm-surface px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  {t("users.detail.activity")}
                </p>
              </div>
              <div className="px-4">
                <InfoRow
                  label={t("users.detail.createdAt")}
                  value={new Date(member.createdAt).toLocaleDateString(
                    "fr-CM",
                    {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                />
                {detail && "lastLoginAt" in detail ? (
                  <InfoRow
                    label={t("users.detail.lastLogin")}
                    value={
                      detail.lastLoginAt
                        ? new Date(detail.lastLoginAt).toLocaleString("fr-CM")
                        : t("users.detail.neverLoggedIn")
                    }
                  />
                ) : null}
                <InfoRow
                  label={t("users.detail.profileCompleted")}
                  value={
                    member.profileCompleted
                      ? t("users.detail.yes")
                      : t("users.detail.no")
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {member.type === "user" && editRolesOpen ? (
        <EditRolesModal
          schoolSlug={schoolSlug}
          userId={member.id}
          currentRoles={member.roles}
          onClose={() => setEditRolesOpen(false)}
          onSuccess={() => {
            void loadDetail();
            onRefreshList();
            onShowToast(t("users.editRoles.success"), "success");
          }}
          t={t}
        />
      ) : null}

      {member.type === "user" && assignChildOpen ? (
        <AssignChildToParentModal
          schoolSlug={schoolSlug}
          parentUserId={member.id}
          onClose={() => setAssignChildOpen(false)}
          onSuccess={() => {
            void loadDetail();
            onShowToast(t("users.assignChild.success"), "success");
          }}
          t={t}
        />
      ) : null}

      {assignParentOpen ? (
        <AssignParentToStudentModal
          schoolSlug={schoolSlug}
          studentId={studentId}
          onClose={() => setAssignParentOpen(false)}
          onSuccess={() => {
            void loadDetail();
            onShowToast(t("users.assignParent.success"), "success");
          }}
          t={t}
        />
      ) : null}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UtilisateursPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { t } = useTranslation();
  const [users, setUsers] = useState<SchoolMember[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [selected, setSelected] = useState<SchoolMember | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadUsers = useCallback(
    async (
      opts: { reset?: boolean; searchVal?: string; pageNum?: number } = {},
    ) => {
      const effectiveSearch = opts.searchVal ?? search;
      const effectivePage = opts.pageNum ?? 1;
      const isReset = opts.reset !== false && effectivePage === 1;

      if (isReset) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const q = new URLSearchParams({
          page: String(effectivePage),
          limit: "20",
        });
        if (effectiveSearch.trim()) q.set("search", effectiveSearch.trim());
        if (roleFilter !== "ALL") q.set("role", roleFilter);

        const res = await apiFetch<{
          data: SchoolMember[];
          total: number;
          hasMore: boolean;
        }>(`/schools/${schoolSlug}/users?${q.toString()}`);
        if (isReset) {
          setUsers(res.data);
        } else {
          setUsers((prev) => [...prev, ...res.data]);
        }
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(effectivePage);
      } catch {
        setError(t("users.error"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [schoolSlug, roleFilter, search, t],
  );

  useEffect(() => {
    void loadUsers({ reset: true });
  }, [roleFilter]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadUsers({ reset: true, searchVal: val });
    }, 400);
  }

  function handleClearSearch() {
    setSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void loadUsers({ reset: true, searchVal: "" });
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
  }

  return (
    <div
      className="flex h-full min-h-screen flex-col bg-background"
      data-testid="utilisateurs-page"
    >
      {/* Top bar */}
      <div className="shrink-0 border-b border-warm-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-text-primary">
              {t("users.title")}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              {t("users.subtitle")}
            </p>
          </div>
          {total > 0 ? (
            <span
              className="shrink-0 rounded-full border border-warm-border bg-warm-surface px-3 py-1 text-xs font-semibold text-text-secondary"
              data-testid="users-total"
            >
              {total} {total > 1 ? t("users.count.many") : t("users.count.one")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — list */}
        <div
          className={`flex flex-col border-r border-warm-border bg-surface ${selected ? "hidden lg:flex lg:w-[380px] xl:w-[420px]" : "w-full lg:w-[380px] xl:w-[420px]"}`}
          style={{ flexShrink: 0 }}
        >
          {/* Search + filter chips */}
          <div className="shrink-0 border-b border-warm-border bg-surface px-4 py-3 space-y-3">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                data-testid="users-search-input"
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t("users.search.placeholder")}
                className="w-full rounded-xl border border-warm-border bg-background py-2.5 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
              {search ? (
                <button
                  type="button"
                  aria-label={t("users.search.clear")}
                  data-testid="users-search-clear"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <XCircle size={16} />
                </button>
              ) : null}
            </div>

            <div
              className="flex gap-1.5 overflow-x-auto pb-0.5"
              data-testid="users-role-filter"
            >
              {ROLE_FILTER_KEYS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  data-testid={`role-filter-${f.value.toLowerCase()}`}
                  onClick={() => setRoleFilter(f.value)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-all ${roleFilter === f.value ? "border-primary bg-primary text-white shadow-sm" : "border-warm-border bg-warm-surface text-text-secondary hover:border-primary/60 hover:text-primary"}`}
                >
                  {t(f.tKey)}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div
              className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              data-testid="users-error"
            >
              {error}
            </div>
          ) : null}

          {/* List */}
          <div className="flex-1 overflow-y-auto" data-testid="users-list">
            {loading ? (
              <p className="py-16 text-center text-sm text-text-secondary">
                {t("users.loading")}
              </p>
            ) : users.length === 0 ? (
              <div
                className="flex flex-col items-center py-16 text-center"
                data-testid="users-empty"
              >
                <Users size={40} className="mb-3 text-text-secondary/30" />
                <p className="text-sm font-semibold text-text-secondary">
                  {search || roleFilter !== "ALL"
                    ? t("users.empty.title")
                    : t("users.empty.noUsers")}
                </p>
                <p className="mt-1 text-xs text-text-secondary/60">
                  {search || roleFilter !== "ALL"
                    ? t("users.empty.message")
                    : t("users.empty.noUsersMsg")}
                </p>
              </div>
            ) : (
              <>
                {users.map((u) => {
                  const isActive = selected?.id === u.id;
                  const name = `${u.lastName} ${u.firstName}`.trim();
                  return (
                    <button
                      key={u.id}
                      type="button"
                      data-testid={`user-card-${u.id}`}
                      onClick={() =>
                        setSelected((prev) => (prev?.id === u.id ? null : u))
                      }
                      className={`w-full border-b border-warm-border/50 px-4 py-3 text-left transition-colors ${isActive ? "border-l-2 border-l-primary bg-[#EEF4FB]" : "hover:bg-warm-highlight"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-semibold ${isActive ? "text-primary" : "text-text-primary"}`}
                          >
                            {name}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <RoleBadge key={r} role={r as SchoolRole} t={t} />
                            ))}
                          </div>
                        </div>
                        {u.hasAccount && u.activationStatus ? (
                          <StatusChip status={u.activationStatus} t={t} />
                        ) : (
                          <span className="shrink-0 rounded-full bg-warm-surface px-2 py-0.5 text-[10px] text-text-secondary">
                            {t("users.noAccount")}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {hasMore ? (
                  <div className="flex justify-center py-4">
                    <button
                      type="button"
                      onClick={() => void loadUsers({ pageNum: page + 1 })}
                      disabled={loadingMore}
                      className="rounded-xl border border-warm-border px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-warm-highlight disabled:opacity-50"
                    >
                      {loadingMore ? "Chargement…" : t("users.loadMore")}
                    </button>
                  </div>
                ) : users.length > 0 ? (
                  <p className="py-4 text-center text-xs text-text-secondary/60">
                    {t("users.allLoaded")}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* RIGHT — detail */}
        {selected ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <UserDetailPanel
              member={selected}
              schoolSlug={schoolSlug}
              onClose={() => setSelected(null)}
              onRefreshList={() => void loadUsers({ reset: true })}
              onShowToast={showToast}
              t={t}
            />
          </div>
        ) : (
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <div className="text-center">
              <Users
                size={52}
                className="mx-auto mb-4 text-text-secondary/20"
              />
              <p className="text-sm text-text-secondary">
                {t("users.selectHint")}
              </p>
            </div>
          </div>
        )}
      </div>

      {toast ? (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
