export type PlatformRole = "SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT";

export type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "SCHOOL_HEALTH_OFFICER"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

export type Role = PlatformRole | SchoolRole;

export type GlobalMeLike = {
  role?: Role | null;
  activeRole?: Role | null;
  platformRoles?: PlatformRole[];
  memberships?: Array<{ schoolId: string; role: SchoolRole }>;
  activeSchoolId?: string | null;
  schools?: Array<{ schoolId: string }>;
};

const ROLE_SET: Set<string> = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "SALES",
  "SUPPORT",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "SCHOOL_HEALTH_OFFICER",
  "TEACHER",
  "PARENT",
  "STUDENT",
]);

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLE_SET.has(value);
}

export function isPlatformRole(role: Role): role is PlatformRole {
  return (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "SALES" ||
    role === "SUPPORT"
  );
}

export function extractAvailableRoles(me: GlobalMeLike | null): Role[] {
  if (!me) {
    return [];
  }

  const activeSchoolId = me.activeSchoolId ?? me.schools?.[0]?.schoolId ?? null;

  const roles = new Set<Role>();
  for (const role of me.platformRoles ?? []) {
    roles.add(role);
  }
  for (const membership of me.memberships ?? []) {
    if (membership.schoolId === activeSchoolId) {
      roles.add(membership.role);
    }
  }
  if (me.role && isRole(me.role)) {
    roles.add(me.role);
  }
  if (me.activeRole && isRole(me.activeRole)) {
    roles.add(me.activeRole);
  }
  return Array.from(roles);
}
