import type { AppRole, PlatformRole, SchoolRole } from "./auth.types.js";

const PLATFORM_ROLE_PRIORITY: PlatformRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES",
  "SUPPORT",
];

const SCHOOL_ROLE_PRIORITY: SchoolRole[] = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "SCHOOL_HEALTH_OFFICER",
  "TEACHER",
  "PARENT",
  "STUDENT",
];

export function getPrimaryRole(
  platformRoles: PlatformRole[],
  schoolRoles: SchoolRole[],
): AppRole | null {
  for (const role of PLATFORM_ROLE_PRIORITY) {
    if (platformRoles.includes(role)) {
      return role;
    }
  }

  for (const role of SCHOOL_ROLE_PRIORITY) {
    if (schoolRoles.includes(role)) {
      return role;
    }
  }

  return null;
}

/**
 * Resolves the role that should govern a user's access for the current request.
 * Falls back to the primary role whenever the persisted `activeRole` is missing
 * or no longer among the user's roles (e.g. membership revoked) — this must stay
 * in sync with everywhere `AuthenticatedUser.activeRole` is trusted, since a
 * single-role user never goes through the role switcher that persists it.
 */
export function resolveActiveRole(
  preferredRole: AppRole | null | undefined,
  platformRoles: PlatformRole[],
  schoolRoles: SchoolRole[],
): AppRole | null {
  const allowedRoles = new Set<AppRole>([
    ...platformRoles,
    ...schoolRoles,
  ] as AppRole[]);

  if (preferredRole && allowedRoles.has(preferredRole)) {
    return preferredRole;
  }

  return getPrimaryRole(platformRoles, schoolRoles);
}
