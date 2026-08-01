import type { AuthenticatedUser } from "../auth/auth.types.js";

// Même repli que HelpGuidesService.isPlatformUser : activeRole prime dès
// qu'il est renseigné, platformRoles ne sert de repli que pour un compte
// pas encore hydraté avec un rôle actif choisi.
export function isSuperAdmin(user: AuthenticatedUser): boolean {
  if (user.activeRole) {
    return user.activeRole === "SUPER_ADMIN";
  }
  return user.platformRoles.includes("SUPER_ADMIN");
}
