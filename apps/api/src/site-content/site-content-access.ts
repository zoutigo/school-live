import type { AuthenticatedUser } from "../auth/auth.types.js";

const PLATFORM_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

// Même repli que HelpGuidesService.isPlatformUser : activeRole prime dès
// qu'il est renseigné, platformRoles ne sert de repli que pour un compte
// pas encore hydraté avec un rôle actif choisi.
export function isPlatformAdmin(user: AuthenticatedUser): boolean {
  if (user.activeRole) {
    return (PLATFORM_ADMIN_ROLES as readonly string[]).includes(
      user.activeRole,
    );
  }
  return user.platformRoles.some((role) =>
    (PLATFORM_ADMIN_ROLES as readonly string[]).includes(role),
  );
}
