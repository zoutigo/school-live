import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types.js";

/**
 * Pour les routes globales (non scopées à une école), où le rôle d'un utilisateur doit
 * compter quelle que soit l'école dont il provient — ex. le module Tests, dont la
 * visibilité dépend du rôle (PARENT/TEACHER/STUDENT/...) et non de l'école active.
 * Remplace SchoolScopeGuard, qui lui restreint aux rôles de l'école résolue par
 * :schoolSlug et n'a pas de sens en l'absence de ce paramètre.
 */
@Injectable()
export class AnyMembershipRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      schoolRoles?: AuthenticatedUser["memberships"][number]["role"][];
    }>();

    if (!req.user) return false;
    req.schoolRoles = req.user.memberships.map((membership) => membership.role);
    return true;
  }
}
